import chai, { expect } from 'chai'
import { Contract, Wallet } from "ethers";
import { solidity, MockProvider } from 'ethereum-waffle'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import ERC20 from '../build/ERC20.json'
import XKeyDao from '../build/XkeyDao.json'
import XKeyToken from '../build/XKeyToken.json'
import XKeySwapLpNFT from '../build/XSwapLPNFT.json'
import XKeyPair from '../build/XKeyPair.json'
import XKeyRouter from '../../xkeyrouter/build/XKeyRouter.json'
import XKeyFactory from '../build/XKeyFactory.json'
import XWETH from '../build/SWETH.json'
import XPokerPower from '../build/XPokerPower.json'
import { BigNumber, bigNumberify } from "ethers/utils";
chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('XkeyDaoSep', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other,nftowner] = provider.getWallets()

  let LPtokenA: Contract
  let LPtokenB:Contract
  let xkeytoken:Contract
  let Dao: Contract
  let XKeySwaplpNft:Contract
  let xkeyFactory:Contract
  let weth:Contract
  let xkeyrouter :Contract
  let pairAB : Contract
  let pairBw : Contract
  let xkeypower : Contract
  beforeEach(async () => {
    XKeySwaplpNft = await deployContract(wallet,XKeySwapLpNFT)
    xkeypower = await deployContract(wallet,XPokerPower,[XKeySwaplpNft.address])
    xkeyFactory = await  deployContract(wallet,XKeyFactory,[XKeySwaplpNft.address])
    weth = await  deployContract(wallet,XWETH)
    xkeyrouter = await  deployContract(wallet,XKeyRouter,[xkeyFactory.address,weth.address])
    LPtokenA = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    LPtokenB = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    await  xkeyFactory.setRouter(xkeyrouter.address)
    await xkeyFactory.createPair(LPtokenA.address,LPtokenB.address)
    await xkeyFactory.createPair(LPtokenB.address,weth.address)
    const pairAddrA = await xkeyFactory.getPair(LPtokenA.address,LPtokenB.address)
    const pairAddrB = await xkeyFactory.getPair(LPtokenB.address,weth.address)
    pairAB = new Contract(pairAddrA, JSON.stringify(XKeyPair.abi), provider).connect(wallet)
    pairBw = new Contract(pairAddrB, JSON.stringify(XKeyPair.abi), provider).connect(wallet)
    xkeytoken = await deployContract(wallet, XKeyToken)
    Dao = await deployContract(wallet,XKeyDao,[xkeytoken.address,xkeypower.address,XKeySwaplpNft.address,84,6])
    await xkeypower.transferOwnership(Dao.address)
    await xkeytoken.setMintContract(Dao.address,expandTo18Decimals(50000000))
  })
  async function addLiquidity(to:Wallet,msg_sender:Wallet,tokenid:BigNumber, token0Amount: BigNumber, token1Amount: BigNumber) {
    if (msg_sender.address != wallet.address){
      await LPtokenA.transfer(msg_sender.address,token0Amount)

      await LPtokenB.transfer(msg_sender.address,token1Amount)
    }
    //expect (await xkeyFactory.getbytecode()).to.eq("")
    await LPtokenA.connect(msg_sender).approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.connect(msg_sender).approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await xkeyrouter.connect(msg_sender).addLiquidity(LPtokenA.address,LPtokenB.address,token0Amount,token1Amount,1,1,expandTo18Decimals(1640970061),tokenid)
  }
  async function addLiquidityETH(to:Wallet,msg_sender:Wallet,tokenid:BigNumber, token0Amount: BigNumber, token1Amount: BigNumber) {
    if (msg_sender.address != wallet.address){
      await LPtokenB.transfer(msg_sender.address,token1Amount)
    }
    //expect (await xkeyFactory.getbytecode()).to.eq("")
    await LPtokenB.connect(msg_sender).approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await xkeyrouter.connect(msg_sender).addLiquidityETH(LPtokenB.address,token0Amount,1,1,expandTo18Decimals(1640970061),tokenid,{
      ...overrides,
      value: token1Amount
    })
  }
  async function initLiquid(){
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("0x7c1a53f2cc5489d73bccedfcb7c89a5e1c0bed7773f5b9cd328db1022c5a1af8")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await addLiquidityETH(wallet,wallet,bigNumberify(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setMinter(wallet.address)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    await addLiquidity(nftowner,nftowner,bigNumberify(3),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(4),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(5),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.connect(nftowner).setApprovalForAll(Dao.address,true)
    await Dao.connect(nftowner).addSwaptokenShareSingle(3)
    await Dao.connect(nftowner).addSwaptokenShareSingle(4)
    await Dao.connect(nftowner).addSwaptokenShareSingle(5)
  }
  /*it ('testBug', async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("0x7c1a53f2cc5489d73bccedfcb7c89a5e1c0bed7773f5b9cd328db1022c5a1af8")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await addLiquidityETH(wallet,wallet,bigNumberify(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setMinter(wallet.address)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    await addLiquidity(nftowner,nftowner,bigNumberify(3),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(4),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(5),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.connect(nftowner).setApprovalForAll(Dao.address,true)
    await Dao.connect(nftowner).addSwaptokenShareSingle(3)
    await Dao.connect(nftowner).removeSwaptokenShareSingle(3)
    await Dao.connect(nftowner).addSwaptokenShareSingle(4)
    expect(await xkeypower.getTokenIdByIndex(nftowner.address,0)).to.eq(4)
    await Dao.connect(nftowner).addSwaptokenShareSingle(5)
    expect(await xkeypower.getTokenIdByIndex(nftowner.address,1)).to.eq(5)
  }).timeout(30000000)*/
  it ('testBug comp', async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("0x7c1a53f2cc5489d73bccedfcb7c89a5e1c0bed7773f5b9cd328db1022c5a1af8")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await addLiquidityETH(wallet,wallet,bigNumberify(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setMinter(wallet.address)
    for(var i= 0;i < 5;i++){
      await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 1, 1+i)
    }
    for(var i= 0;i < 5;i++){
      await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1+i)
    }
    for(var i= 0;i < 5;i++){
      await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1+i)
    }
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    for(var i= 0;i < 5;i++){
      await addLiquidity(nftowner,nftowner,bigNumberify(3+i),expandTo18Decimals(10),expandTo18Decimals(10))
    }
    for(var i= 0;i < 5;i++){
      await addLiquidityETH(nftowner,nftowner,bigNumberify(8+i),expandTo18Decimals(10),expandTo18Decimals(10))
    }
    for(var i= 0;i < 5;i++){
      await addLiquidityETH(nftowner,nftowner,bigNumberify(13+i),expandTo18Decimals(10),expandTo18Decimals(10))
    }
    await XKeySwaplpNft.connect(nftowner).setApprovalForAll(Dao.address,true)
    await Dao.connect(nftowner).addSwaptokenShareCombine([3,4,5,6,7])
    await Dao.connect(nftowner).removeSwaptokenShareCombine(0)
    await Dao.connect(nftowner).addSwaptokenShareCombine([8,9,10,11,12])
    //expect(await xkeypower.getTokenIdsByIndex(nftowner.address,0)).to.eq([0x08,0x09,0x0a,0x0b,0x0c])
    await Dao.connect(nftowner).addSwaptokenShareCombine([13,14,15,16,17])
    expect(await xkeypower.getTokenIdsByIndex(nftowner.address,1)).to.eq([0x0d,0x0e,0x10,0x11,0x12])
  }).timeout(30000000)
  /*
  it('SepComplex', async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("0x7c1a53f2cc5489d73bccedfcb7c89a5e1c0bed7773f5b9cd328db1022c5a1af8")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await addLiquidityETH(wallet,wallet,bigNumberify(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setMinter(wallet.address)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    await addLiquidity(nftowner,nftowner,bigNumberify(3),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(4),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(5),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.connect(nftowner).setApprovalForAll(Dao.address,true)
    await Dao.connect(nftowner).addSwaptokenShareSingle(3)
    await Dao.connect(nftowner).addSwaptokenShareSingle(4)
    await Dao.connect(nftowner).addSwaptokenShareSingle(5)

    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 1+6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(5*84*10*4/10+1*84*10*4/10 + 6*84*4*10/10/2+ 1*84*4*10/10/2/2+ 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    expect(await Dao.swaptoken_hadmint(pairAB.address)).to.eq(bigNumberify(5*84*10*4/10+1*84*10*4/10 + 6*84*4*10/10/2+ 1*84*4*10/10/2/2).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_current_stage(pairBw.address)).to.eq(0)
    //expect(await Dao.predReward(LPtokenB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairBw.address)
    expect(await Dao.swaptoken_current_stage(pairBw.address)).to.eq(2)
    console.log("hha")
    expectToken = (bigNumberify(6*84*10*4/10+6*84*4*10/10/2+ 1*84*4*10/10/2/2+1*84*6*10/10+4*84*6*10/10+6*84*6*10/10/2+2*84*6*10/10/2/2).mul(bigNumberify(10).pow(17)))
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    expect(await Dao.swaptoken_hadmint(pairAB.address)).to.eq((bigNumberify(6*84*10*4/10+6*84*4*10/10/2+ 1*84*4*10/10/2/2).mul(bigNumberify(10).pow(17)))
    )
    for(var i= 0;i < 4;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(6*84*100*4/10+6*84*4*100/10/2+ 6*84*4*100/10/2/2+1*84*4*100/10/2/2/2+1*84*6*100/10+4*84*6*100/10+6*84*6*100/10/2+2*84*6*100/10/2/2).mul(bigNumberify(10).pow(16)))
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    expect(await Dao.swaptoken_hadmint(pairBw.address)).to.eq(bigNumberify(1*84*6*100/10+4*84*6*100/10+6*84*6*100/10/2+2*84*6*100/10/2/2).mul(bigNumberify(10).pow(16)))
  }).timeout(30000000)
  /*
  it('GetPrice', async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("0x7c1a53f2cc5489d73bccedfcb7c89a5e1c0bed7773f5b9cd328db1022c5a1af8")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await addLiquidityETH(wallet,wallet,bigNumberify(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setMinter(wallet.address)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 1, 1)
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    await addLiquidity(nftowner,nftowner,bigNumberify(3),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(4),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(nftowner,nftowner,bigNumberify(5),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.connect(nftowner).setApprovalForAll(Dao.address,true)


    expect(await Dao.getCurrentStagePrice()).to.eq(expandTo18Decimals(84))
    await Dao.connect(nftowner).addSwaptokenShareSingle(3)
    expect(await Dao.getCurrentStagePrice()).to.eq(expandTo18Decimals(84))
    await Dao.connect(nftowner).addSwaptokenShareSingle(4)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.getCurrentStagePrice()).to.eq(expandTo18Decimals(84))
    for(var i= 0;i < 1;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    console.log("pass")
    expect(await Dao.getCurrentStagePrice()).to.eq(expandTo18Decimals(84))
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    var expectToken = (bigNumberify(42).mul(bigNumberify(10).pow(18)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(21).mul(bigNumberify(10).pow(18)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(105).mul(bigNumberify(10).pow(17)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(525).mul(bigNumberify(10).pow(16)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(2625).mul(bigNumberify(10).pow(15)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(13125).mul(bigNumberify(10).pow(14)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(65625).mul(bigNumberify(10).pow(13)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
    for(var i= 0;i < 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(65625).mul(bigNumberify(10).pow(13)))
    expect(await Dao.getCurrentStagePrice()).to.eq(expectToken)
  }).timeout(30000000)
  it('predReward', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 1;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(84*10*4/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.connect(nftowner).predReward(pairAB.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('predRewardTwo',async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 7;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(84*10*4/10+6*84*10*4/10/2).mul(bigNumberify(10).pow(17)))
    expect(await Dao.connect(nftowner).predReward(pairAB.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('predRewardThree', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 13;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(84*10*4/10+6*84*10*4/10/2+6*84*10*4/10/2/2).mul(bigNumberify(10).pow(17)))
    expect(await Dao.connect(nftowner).predReward(pairAB.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('predRewardFour', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 13+4*6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(23205).mul(bigNumberify(10).pow(16)))
    expect(await Dao.connect(nftowner).predReward(pairAB.address)).to.eq(expectToken)
  }).timeout(30000000)

  it('predRewardFive', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 13+4*6 + 6;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    expectToken = (bigNumberify(233625).mul(bigNumberify(10).pow(15)))
    expect(await Dao.connect(nftowner).predReward(pairAB.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepOne', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 1;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(5*84*10*4/10+1*84*10*4/10 + 1*84*4*10/10/2+ 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepTwo', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 10;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(5*84*10*4/10+1*84*10*4/10 + 6*84*4*10/10/2+5*84*4*10/10/2/2+ 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepThree', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 16;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(6*84*100*4/10 + 6*84*4*100/10/2+6*84*4*100/10/2/2+5*84*4*100/10/2/2/2+ 1*84*6*100/10).mul(bigNumberify(10).pow(16)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepFour', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 22;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(6*84*1000*4/10 + 6*84*4*1000/10/2+6*84*4*1000/10/2/2+6*84*4*1000/10/2/2/2+5*84*4*1000/10/2/2/2/2+ 1*84*6*1000/10).mul(bigNumberify(10).pow(15)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepFive', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 28;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(390600*10+5*84*4*10000/10/2/2/2/2/2+ 1*84*6*10000/10).mul(bigNumberify(10).pow(14)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepSix', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 34;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(39690000+5*84*4*100000/10/2/2/2/2/2/2+ 1*84*6*100000/10).mul(bigNumberify(10).pow(13)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepSeven', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 40;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(40005000+5*84*4*100000/10/2/2/2/2/2/2/2+1*84*6*100000/10).mul(bigNumberify(10).pow(13)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  it('SepEight', async () => {
    await initLiquid()
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    var expectToken =  (bigNumberify(5*84*4*10/10 + 1*84*6*10/10).mul(bigNumberify(10).pow(17)))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
    for(var i= 0;i < 46;i++){
      await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    }
    await LPtokenA.transfer(other.address,expandTo18Decimals(1))
    await Dao.connect(nftowner).getSwaptokenReward(pairAB.address)
    expectToken = (bigNumberify(40005000+11*84*4*100000/10/2/2/2/2/2/2/2+1*84*6*100000/10).mul(bigNumberify(10).pow(13)))
    expect(await Dao.connect(nftowner).getAddrBalanceof(nftowner.address)).to.eq(expectToken)
  }).timeout(30000000)
  */
})