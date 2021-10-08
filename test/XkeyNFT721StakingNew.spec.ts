import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { AddressZero } from 'ethers/constants'
import { MaxUint256 } from 'ethers/constants'
import { bigNumberify } from 'ethers/utils'
// @ts-ignore
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import { mineBlock} from './shared/utilities'
import { getCreate2Address } from './shared/utilities'
import ERC20 from '../build/ERC20.json'
import ERC721 from '../build/MyNFT.json'
import XkeyNFT721StakingNew from '../build/XkeyNFT721StakingNew.json'
import xPokerSpecial from '../build/xPokerSpecial.json'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('XkeyNFT721StakingNew', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let LPtokenA: Contract
  let LPtokenB:Contract
  let xps:Contract
  let Dao: Contract
  let tokenid1: bigint
  let tokenid2: bigint
  // @ts-ignore
  beforeEach(async () => {
    LPtokenA = await deployContract(wallet, ERC721)
    await LPtokenA._mint(wallet.address,1)
    // await LPtokenA._mint(wallet.address,2)
    LPtokenB = await deployContract(wallet, ERC721)
    await LPtokenB._mint(wallet.address,1)
    xps = await deployContract(wallet, xPokerSpecial,[wallet.address])
    Dao = await deployContract(wallet,XkeyNFT721StakingNew,[xps.address])
    await xps.setMinter(Dao.address)
    await Dao.InitSupportNFT(["0x3646ca66b5DDDfE354F166c25789011c2632BB44",LPtokenA.address,LPtokenB.address])
    // await xps.setMintContract(Dao.address,expandTo18Decimals(600000000))
  })

  it('init', async () => {
    expect(await Dao.erc721_mintaddr()).to.eq(xps.address)
    expect(await Dao.GetOwner()).to.eq(wallet.address)
   // console.log("ssss:",await Dao.GetPoolStatus(1))
    expect(await Dao.GetPoolStatus(1)).to.eq(true)
    expect(await Dao.GetPoolStatus(2)).to.eq(true)
    expect(await Dao.GetPoolStatus(3)).to.eq(true)
    // expect(await Dao.GetPoolStatus(4)).to.eq(false)
    // expect(await Dao.GetPoolStart(1)).to.eq(1620459657)
    // expect(await Dao.GetPoolStart(2)).to.eq(1620459657)
    // expect(await Dao.GetPoolStart(3)).to.eq(1620459657)
    // expect(await Dao.GetPoolCloseat(1)).to.eq(1)
    // expect(await Dao.GetPoolCloseat(2)).to.eq(1)
    // expect(await Dao.GetPoolCloseat(3)).to.eq(1)
  })

  it('initsupportnft721contracts', async () => {
    await Dao.InitSupportNFT(["0x3646ca66b5DDDfE354F166c25789011c2632BB44"])
    expect(await Dao.supportNFTContracts("0x3646ca66b5DDDfE354F166c25789011c2632BB44")).to.eq(true)
  })

  it('change Erc Mint addr',async () => {
    const tokenA =await deployContract(wallet, xPokerSpecial,[wallet.address])
    await Dao.ChangeMintErcAddr(tokenA.address)
    expect(await Dao.erc721_mintaddr()).to.eq(tokenA.address)
  })

  it('closepool', async () => {
    await Dao.ClosePool(1)
    expect(await Dao.GetPoolStatus(1)).to.eq(false)
  })
  it('openpool', async () => {
    await Dao.ClosePool(1)
    expect(await Dao.GetPoolStatus(1)).to.eq(false)
    await Dao.OpenPool(1)
    expect(await Dao.GetPoolStatus(1)).to.eq(true)
  })
  it('AddNFT721',async () => {
    await LPtokenA.approve(Dao.address,1)
    await LPtokenB.approve(Dao.address,1)
    await Dao.AddNFT721(LPtokenA.address,1,1)
    await Dao.AddNFT721(LPtokenB.address,1,2)
    expect(await LPtokenA.balanceOf(Dao.address)).to.eq(1)
    expect(await LPtokenB.balanceOf(Dao.address)).to.eq(1)
    expect(await Dao.GetUserIfInpool(wallet.address,1)).to.eq(true)
    expect(await Dao.GetUserIfInpool(wallet.address,2)).to.eq(true)
  })
  it('RemoveNFT721',async () => {
    await LPtokenA.approve(Dao.address,1)
    await LPtokenB.approve(Dao.address,1)
    await Dao.AddNFT721(LPtokenA.address,1,1)
    await Dao.AddNFT721(LPtokenB.address,1,2)
    await Dao.ChangePoolStart(1,wallet.address)
    await Dao.ChangePoolStart(2,wallet.address)
    await Dao.RemoveNFT721(LPtokenA.address,1,1)
    await Dao.RemoveNFT721(LPtokenB.address,1,2)
    expect(await LPtokenA.balanceOf(wallet.address)).to.eq(1)
    expect(await LPtokenB.balanceOf(wallet.address)).to.eq(1)
    expect(await xps.balanceOf(wallet.address)).to.eq(2)
  })
})
