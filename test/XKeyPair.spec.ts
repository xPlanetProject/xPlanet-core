import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider } from 'ethereum-waffle'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import ERC20 from '../build/ERC20.json'
import XKeyDao from '../build/XkeyDao.json'
import XKeyToken from '../build/XKeyToken.json'
import XKeySwapLpNFT from '../build/XSwapLPNFT.json'
import XKeyFactory from '../build/XKeyFactory.json'
import XKeyPair from '../build/XKeyPair.json'
import {bigNumberify} from "ethers/utils";
chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('XKeyFactory', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other,NFTOwner] = provider.getWallets()
  let XKeySwaplpNft : Contract
  let xkeyFactory : Contract
  let LPtokenA: Contract
  let LPtokenB:Contract
  let xkeytoken:Contract
  let Dao: Contract
  let pair : Contract
  beforeEach(async () => {
    XKeySwaplpNft = await deployContract(wallet,XKeySwapLpNFT)
    await XKeySwaplpNft.setMinter(wallet.address)
    xkeyFactory = await  deployContract(wallet,XKeyFactory,[XKeySwaplpNft.address])
    await  xkeyFactory.setRouter(wallet.address)
    LPtokenA = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    LPtokenB = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    await xkeyFactory.createPair(LPtokenA.address,LPtokenB.address)
    const pairAddr = await xkeyFactory.getPair(LPtokenA.address,LPtokenB.address)
    pair = new Contract(pairAddr, JSON.stringify(XKeyPair.abi), provider).connect(wallet)
  })

  it('init', async () => {
    expect(await pair.factory()).to.eq(xkeyFactory.address)
    if(LPtokenA.address < LPtokenB.address){
      expect(await pair.token0()).to.eq(LPtokenA.address)
      expect(await pair.token1()).to.eq(LPtokenB.address)
    }
    else{
      expect(await pair.token0()).to.eq(LPtokenB.address)
      expect(await pair.token1()).to.eq(LPtokenA.address)
    }
    expect(await pair.nft()).to.eq(XKeySwaplpNft.address)
    expect(await pair.router()).to.eq(wallet.address)
    expect(await pair.totalSupply()).to.eq(0)
    expect(await pair.name()).to.eq("Pair ERC")
    expect(await pair.symbol()).to.eq("PAIRERC20")
    expect(await pair.decimal()).to.eq(expandTo18Decimals(1))
  })
  it('onlyrouter', async () => {
    await expect(pair.connect(other).TransferBurnAmount(wallet.address,1,20)).to.be.revertedWith("Only Router can use this method")
    await expect(pair.TransferBurnAmount(wallet.address,1,20)).to.be.revertedWith('ERC721: owner query for nonexistent token')
    await XKeySwaplpNft.mintUniqueTokenTo(NFTOwner.address)
    await expect(pair.TransferBurnAmount(wallet.address,1,20)).to.be.revertedWith('Not token Owner cant transfer')
    await expect(pair.TransferBurnAmount(NFTOwner.address,1,20)).to.be.revertedWith('Not enough liquidity to remove')
    await LPtokenA.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenB.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await pair.mint(1)
    expect (await pair.balanceOf(1)).to.eq(expandTo18Decimals(10).sub(1000))
    await expect(pair.TransferBurnAmount(NFTOwner.address,1,expandTo18Decimals(20))).to.be.revertedWith('Not enough liquidity to remove')
    await pair.TransferBurnAmount(NFTOwner.address,1,expandTo18Decimals(3))
    expect(await pair.balanceOf(0)).to.eq(expandTo18Decimals(3))
  })
  it('mint second', async () => {
    await XKeySwaplpNft.mintUniqueTokenTo(NFTOwner.address)
    await LPtokenA.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenB.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await expect(pair.mint(0)).to.be.revertedWith('XKey : mint token id is wrong')
    await pair.mint(1)
    expect (await pair.balanceOf(1)).to.eq(expandTo18Decimals(10).sub(1000))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await expect(pair.mint(2)).to.be.revertedWith('ERC721: owner query for nonexistent token')
    await pair.mint(1)
    expect (await pair.balanceOf(1)).to.eq(expandTo18Decimals(20).sub(1000))
    expect(await pair.balanceOf(0)).to.eq(expandTo18Decimals(0))
  })
  it('burn', async () => {
    await XKeySwaplpNft.mintUniqueTokenTo(NFTOwner.address)
    await LPtokenA.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenB.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await pair.mint(1)
    expect (await LPtokenA.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -10))
    expect (await LPtokenB.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -10))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await expect(pair.mint(2)).to.be.revertedWith('ERC721: owner query for nonexistent token')
    await pair.mint(1)
    expect (await pair.balanceOf(1)).to.eq(expandTo18Decimals(20).sub(1000))
    expect(await pair.balanceOf(0)).to.eq(expandTo18Decimals(0))
    expect (await LPtokenA.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20))
    expect (await LPtokenB.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20))
    await pair.TransferBurnAmount(NFTOwner.address,1,expandTo18Decimals(3))
    await pair.burn(NFTOwner.address,1)
    expect (await LPtokenA.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20+3))
    expect (await LPtokenB.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20+3))
  }).timeout(30000000)
  it('burn all', async () => {
    await XKeySwaplpNft.mintUniqueTokenTo(NFTOwner.address)
    await LPtokenA.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenB.transfer(NFTOwner.address,expandTo18Decimals(2000))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await pair.mint(1)
    expect (await LPtokenA.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -10))
    expect (await LPtokenB.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -10))
    await LPtokenA.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await LPtokenB.connect(NFTOwner).transfer(pair.address,expandTo18Decimals(10))
    await expect(pair.mint(2)).to.be.revertedWith('ERC721: owner query for nonexistent token')
    await pair.mint(1)
    expect (await pair.balanceOf(1)).to.eq(expandTo18Decimals(20).sub(1000))
    expect(await pair.balanceOf(0)).to.eq(expandTo18Decimals(0))
    expect (await LPtokenA.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20))
    expect (await LPtokenB.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20))
    await pair.TransferBurnAmount(NFTOwner.address,1,1000)
    await pair.burn(NFTOwner.address,1)
    await pair.TransferBurnAmount(NFTOwner.address,1,expandTo18Decimals(20).sub(2000))
    await pair.burn(NFTOwner.address,1)
    var expectvalue = expandTo18Decimals(20).sub(1000).mul(expandTo18Decimals(20)).div(expandTo18Decimals(20))
    expect (await LPtokenA.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20).add(expectvalue))
    expect (await LPtokenB.balanceOf(NFTOwner.address)).to.eq(expandTo18Decimals(2000 -20).add(expectvalue))
  }).timeout(30000000)
})
