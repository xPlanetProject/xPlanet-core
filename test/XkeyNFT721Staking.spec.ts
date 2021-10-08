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
import XkeyNFT721Staking from '../build/XkeyNFT721Staking.json'
import XKeyToken from '../build/XKeyToken.json'
chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('XkeyNFT721Staking', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let LPtokenA: Contract
  let LPtokenB:Contract
  let xkeytoken:Contract
  let Dao: Contract
  let tokenid1: bigint
  let tokenid2: bigint
  // @ts-ignore
  beforeEach(async () => {
    LPtokenA = await deployContract(wallet, ERC721)
    await LPtokenA._mint(wallet.address,1)
    await LPtokenA._mint(wallet.address,2)
    LPtokenB = await deployContract(wallet, ERC721)
    await LPtokenB._mint(wallet.address,1)
    xkeytoken = await deployContract(wallet, XKeyToken)
    Dao = await deployContract(wallet,XkeyNFT721Staking,[xkeytoken.address,30,expandTo18Decimals(20000000)])
    // await Dao.InitSupportNFT(["0x3646ca66b5DDDfE354F166c25789011c2632BB44",LPtokenA.address,LPtokenB.address])
    await xkeytoken.setMintContract(Dao.address,expandTo18Decimals(600000000))
  })

  it('init', async () => {
    expect(await Dao.erc_mintaddr()).to.eq(xkeytoken.address)
    expect(await Dao.perblockreward()).to.eq(expandTo18Decimals(30))
    expect(await Dao.GetOwner()).to.eq(wallet.address)
    expect(await Dao.swaptoken_totalMint()).to.eq(expandTo18Decimals(20000000))
  })

  // it('initsupportnft721contracts', async () => {
  //   await Dao.InitSupportNFT(["0x3646ca66b5DDDfE354F166c25789011c2632BB44"])
  //   expect(await Dao.supportNFTContracts("0x3646ca66b5DDDfE354F166c25789011c2632BB44")).to.eq(true)
  // })
  it('createswaptoken', async () => {
    await Dao.CreateLiquidSwap(LPtokenA.address,5,6)
    expect(await Dao.all_weight()).to.eq(5)
    expect(await Dao.swaptoken_weight(LPtokenA.address)).to.eq(5)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(17)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
  })
  it('createTwoswaptoken', async () => {
    await Dao.CreateLiquidSwap(LPtokenA.address,4,20)
    await Dao.CreateLiquidSwap(LPtokenB.address,6,1)
    expect(await Dao.all_weight()).to.eq(10)
    expect(await Dao.swaptoken_weight(LPtokenA.address)).to.eq(4)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(27)
    expect(await Dao.swaptoken_weight(LPtokenB.address)).to.eq(6)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenB.address)).to.eq(27)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    expect(await Dao.swaptoken_pershare_reward(LPtokenB.address)).to.eq(0)
  })

  // it('changeswapTokenWeight', async () => {
  //   await Dao.CreateLiquidSwap(LPtokenA.address,5,6)
  //   await Dao.CreateLiquidSwap(LPtokenB.address,7,7)
  //   await Dao.ChangeSwaptokenWeight(LPtokenA.address,8)
  //   expect(await Dao.all_weight()).to.eq(15)
  //   expect(await Dao.swaptoken_weight(LPtokenA.address)).to.eq(8)
  //   expect(await Dao.swaptoken_startnum(LPtokenA.address)).to.eq(6)
  //   expect(await Dao.swaptoken_weight(LPtokenB.address)).to.eq(7)
  //   expect(await Dao.swaptoken_startnum(LPtokenB.address)).to.eq(7)
  //   expect(await Dao.swaptoken_totalshare(LPtokenA.address)).to.eq(0)
  //   expect(await Dao.swaptoken_totalshare(LPtokenB.address)).to.eq(0)
  // })
  it('ChangeWeight', async () => {
    await Dao.CreateLiquidSwap(LPtokenA.address,4,1)
    await Dao.CreateLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,1)
    await LPtokenB.approve(Dao.address,1)
    await Dao.AddSwaptokenShare(LPtokenA.address,1)
    await Dao.AddSwaptokenShare(LPtokenB.address,1)
    await LPtokenA.transferFrom(wallet.address,other.address,2)
    await LPtokenA.connect(other).approve(Dao.address,2)
    const TokenBPerShare = bigNumberify((4)*30*4/10).mul(bigNumberify(10).pow(30))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.GetSwaptokenReward(LPtokenA.address)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(TokenBPerShare)
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+4*30*4/10))
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,2)
    await Dao.GetSwaptokenReward(LPtokenA.address)
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+4*30*4/10 + 1*30*4/10+1*30*4/10/2))
    //await Dao.ChangeSwaptokenWeight(LPtokenA.address,24)
    const tx = await Dao.ChangeSwaptokenWeight(LPtokenA.address,24)
    const receipt = await tx.wait()
    console.log(receipt.gasUsed)
    await Dao.GetSwaptokenReward(LPtokenA.address)
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+4*30*4/10 + 1*30*4/10+2*30*4/10/2+1*30*24/30/2))
  })
  it('change Erc Mint addr',async () => {
    const tokenA = await deployContract(wallet, XKeyToken)
    await Dao.ChangeMintErcAddr(tokenA.address)
    expect(await Dao.erc_mintaddr()).to.eq(tokenA.address)
  })
  // it('AddSwapToken',async () => {
  //   await Dao.CreateLiquidSwap(LPtokenA.address,5,50)
  //   await Dao.CreateLiquidSwap(LPtokenB.address,5,3)
  //   await LPtokenA.approve(Dao.address,1)
  //   await LPtokenB.approve(Dao.address,1)
  //   await Dao.AddSwaptokenShare(LPtokenA.address,1)
  //   expect(await Dao.GetUserLastRewardBlock(LPtokenA.address,wallet.address)).to.eq(77)
  //   expect(await Dao.swaptoken_totalshare(LPtokenA.address)).to.eq(1)
  //   expect(await Dao.GetUserShare(LPtokenA.address,wallet.address)).to.eq(1)
  //   expect(await Dao.GetUserIfhaveTokenid(LPtokenA.address,wallet.address,1)).to.eq(true)
  //   await Dao.AddSwaptokenShare(LPtokenB.address,1)
  //   expect(await Dao.GetUserLastRewardBlock(LPtokenB.address,wallet.address)).to.eq(78)
  //   expect(await Dao.swaptoken_totalshare(LPtokenB.address)).to.eq(1)
  //   expect(await Dao.GetUserShare(LPtokenB.address,wallet.address)).to.eq(1)
  //   expect(await Dao.GetUserIfhaveTokenid(LPtokenB.address,wallet.address,1)).to.eq(true)
  //   await Dao.RemoveSwaptokenShare(LPtokenA.address,1)
  //   await Dao.RemoveSwaptokenShare(LPtokenB.address,1)
  // })
  it('AddSwapToken',async () => {
    await Dao.CreateLiquidSwap(LPtokenA.address,4,50)
    await Dao.CreateLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,1)
    await LPtokenB.approve(Dao.address,1)
    await Dao.AddSwaptokenShare(LPtokenA.address,1)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(71)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    expect(await LPtokenA.balanceOf(Dao.address)).to.eq(1)
    expect(await Dao.GetUserShare(LPtokenA.address,wallet.address)).to.eq(1)

    await Dao.AddSwaptokenShare(LPtokenB.address,1)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenB.address)).to.eq(72)
    expect(await LPtokenB.balanceOf(Dao.address)).to.eq(1)
    expect(await Dao.swaptoken_pershare_reward(LPtokenB.address)).to.eq(0)
    expect(await Dao.GetUserShare(LPtokenB.address,wallet.address)).to.eq(1)
  })
  // it('RemoveSwapToken',async () => {
  //   await Dao.CreateLiquidSwap(LPtokenA.address,5,20)
  //   await Dao.CreateLiquidSwap(LPtokenB.address,5,3)
  //   await LPtokenA.approve(Dao.address,1)
  //   await LPtokenB.approve(Dao.address,1)
  //   await Dao.AddSwaptokenShare(LPtokenA.address,1)
  //   await Dao.AddSwaptokenShare(LPtokenB.address,1)
  //   await Dao.RemoveSwaptokenShare(LPtokenB.address,1)
  //   await Dao.RemoveSwaptokenShare(LPtokenA.address,1)
  //   // await Dao.AddSwaptokenShare(LPtokenB.address,1)
  //   expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(100000000+4*15))
  //   expect(await Dao.swaptoken_totalshare(LPtokenB.address)).to.eq(0)
  //   expect(await Dao.GetUserLastRewardBlock(LPtokenB.address,wallet.address)).to.eq(96)
  //   expect(await Dao.GetUserLastRewardBlock(LPtokenA.address,wallet.address)).to.eq(97)
  //   expect(await Dao.GetUserShare(LPtokenB.address,wallet.address)).to.eq(0)
  //   expect(await Dao.GetUserIfhaveTokenid(LPtokenA.address,wallet.address,1)).to.eq(false)
  //   // await Dao.RemoveSwaptokenShare(LPtokenA.address,1)
  //   expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(100000000+4*15))
  //   expect(await Dao.swaptoken_totalshare(LPtokenA.address)).to.eq(0)
  //   expect(await Dao.GetUserLastRewardBlock(LPtokenA.address,wallet.address)).to.eq(97)
  //   expect(await Dao.GetUserShare(LPtokenA.address,wallet.address)).to.eq(0)
  //   expect(await Dao.GetUserIfhaveTokenid(LPtokenA.address,wallet.address,1)).to.eq(false)
  //   await expect(Dao.RemoveSwaptokenShare(LPtokenA.address,1))
  //       .to.be.revertedWith('Dont Have this tokenid to remove')
  // })
  it('RemoveSwapToken',async () => {
    await Dao.CreateLiquidSwap(LPtokenA.address,4,50)
    await Dao.CreateLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,1)
    await LPtokenB.approve(Dao.address,1)
    await Dao.AddSwaptokenShare(LPtokenA.address,1)
    await Dao.AddSwaptokenShare(LPtokenB.address,1)
    await Dao.RemoveSwaptokenShare(LPtokenB.address,[1])
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000 + 1*30*6/10))
    expect(await LPtokenB.balanceOf(Dao.address)).to.eq(0)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenB.address)).to.eq(87)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(85)
    expect(await Dao.GetUserShare(LPtokenB.address,wallet.address)).to.eq(0)
    await Dao.RemoveSwaptokenShare(LPtokenA.address,[1])
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000 + 1*30*6/10 + 3*30*4/10))
    expect(await LPtokenA.balanceOf(Dao.address)).to.eq(0)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(88)
    expect(await Dao.GetUserShare(LPtokenB.address,wallet.address)).to.eq(0)
    await expect(Dao.RemoveSwaptokenShare(LPtokenA.address,[1]))
      .to.be.revertedWith('Dont Have Enough token to remove')
  })
  it('GetReward',async () => {
    await Dao.CreateLiquidSwap(LPtokenA.address,4,1)
    await Dao.CreateLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,1)
    await LPtokenB.approve(Dao.address,1)
    await Dao.AddSwaptokenShare(LPtokenA.address,1)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(101)
    await Dao.AddSwaptokenShare(LPtokenB.address,1)
    await LPtokenA.transferFrom(wallet.address,other.address,2)
    await LPtokenA.connect(other).approve(Dao.address,2)
    const TokenBPerShare = bigNumberify((105-101)*30*4/10).mul(bigNumberify(10).pow(30))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.GetSwaptokenReward(LPtokenA.address)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(105)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(TokenBPerShare)
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+4*30*4/10))
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,2)
    await Dao.GetSwaptokenReward(LPtokenA.address)
    expect(await Dao.GetAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+4*30*4/10 + 1*30*4/10+1*30*4/10/2))
  })
})
