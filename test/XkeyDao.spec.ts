import chai, { expect } from 'chai'
import { Contract, Wallet } from "ethers";
import { solidity, MockProvider } from 'ethereum-waffle'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import ERC20 from '../build/TempERC20.json'
import XKeyDao from '../build/XkeyDao.json'
import XKeyToken from '../build/XKeyToken.json'
import XKeySwapLpNFT from '../build/XSwapLPNFT.json'
import XKeyPair from '../build/XKeyPair.json'
import XKeyRouter from '../../xkeyrouter/build/XKeyRouter.json'
import XKeyFactory from '../build/XKeyFactory.json'
import XWETH from '../build/SWETH.json'
import XPokerPower from '../build/XPokerPower.json'
import { BigNumber, bigNumberify } from "ethers/utils";
import { pairFixture } from "./shared/fixtures";
chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('XkeyDao', () => {
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

    LPtokenA = await deployContract(wallet, ERC20,["LPA",18])

    LPtokenB = await deployContract(wallet, ERC20,["LPB",18])

    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    await  xkeyFactory.setRouter(xkeyrouter.address)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))

    //await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await xkeyFactory.createPair(LPtokenA.address,LPtokenB.address)
    /*
    await xkeyrouter.addLiquidityETH(LPtokenB.address,bigNumberify(10).pow(10),bigNumberify(10).pow(10),bigNumberify(10).pow(10),1632170877,0,{
      ...overrides,
      value: bigNumberify(10).pow(10)
    })
     */
    await xkeyFactory.createPair(LPtokenB.address,weth.address)
    const pairAddrA = await xkeyFactory.getPair(LPtokenA.address,LPtokenB.address)
    const pairAddrB = await xkeyFactory.getPair(LPtokenB.address,weth.address)
    pairAB = new Contract(pairAddrA, JSON.stringify(XKeyPair.abi), provider).connect(wallet)
    pairBw = new Contract(pairAddrB, JSON.stringify(XKeyPair.abi), provider).connect(wallet)
    xkeytoken = await deployContract(wallet, XKeyToken)
    Dao = await deployContract(wallet,XKeyDao,[xkeytoken.address,xkeypower.address,XKeySwaplpNft.address,84,598153])
    await xkeypower.transferOwnership(Dao.address)
    await xkeytoken.setMintContract(Dao.address,expandTo18Decimals(50000000))
  })
  /*
  it('test xkey router code', async () => {
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
      //test 0x999166400106f530b7aa5a4c7160878495a12e0f831d3b89dd0e3a3b10f86eca
      //formal 0xc47a148e277c334e097260ed9d4e0a2cc48545b135b0baa43f8286414ac36f04
    var codehash1 = await xkeyrouter.getPairFor(LPtokenA.address,LPtokenB.address)
    var codehash2 = await xkeyrouter.getPairFor(LPtokenB.address,weth.address)
    console.log(codehash1)
    console.log(pairAB.address)
    console.log(pairBw.address)
    console.log(codehash2)
    expect (pairAB.address).to.eq(codehash1)
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
  }).timeout(30000000)

  //14
  it('init', async () => {
    expect(await Dao.erc_mintaddr()).to.eq(xkeytoken.address)
    expect(await Dao.perblockreward()).to.eq(expandTo18Decimals(84))
    expect(await Dao.getOwner()).to.eq(wallet.address)
    expect(await Dao.xkeyPokerPower()).to.eq(xkeypower.address)
    expect(await Dao.swaptoken_totalMint()).to.eq(expandTo18Decimals(100000000))
  }).timeout(30000000)
  //28
  it('createswaptoken', async () => {
    await Dao.createLiquidSwap(pairAB.address,4,120)
    expect(await Dao.all_weight()).to.eq(4)
    expect(await Dao.swaptoken_weight(pairAB.address)).to.eq(4)
    expect(await Dao.swaptoken_last_reward_blocknum(pairAB.address)).to.eq(120)
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
  }).timeout(30000000)
  //43
  it('createTwoswaptoken', async () => {
    await Dao.createLiquidSwap(pairAB.address,4,90)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    expect(await Dao.all_weight()).to.eq(10)
    expect(await Dao.swaptoken_weight(pairAB.address)).to.eq(4)
    expect(await Dao.swaptoken_last_reward_blocknum(pairAB.address)).to.eq(90)
    expect(await Dao.swaptoken_weight(pairBw.address)).to.eq(6)
    expect(await Dao.swaptoken_last_reward_blocknum(pairBw.address)).to.eq(74)
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    expect(await Dao.swaptoken_pershare_reward(pairBw.address)).to.eq(0)
  }).timeout(30000000)
  //59
    it('changeSwaptokenWeight', async () => {
      await Dao.createLiquidSwap(pairAB.address,5,53)
      await Dao.createLiquidSwap(pairBw.address,7,100)
      await Dao.changeSwaptokenWeight(pairAB.address,8)
      expect(await Dao.all_weight()).to.eq(15)
      expect(await Dao.swaptoken_weight(pairAB.address)).to.eq(8)
      expect(await Dao.swaptoken_last_reward_blocknum(pairAB.address)).to.eq(94)
      expect(await Dao.swaptoken_weight(pairBw.address)).to.eq(7)
      expect(await Dao.swaptoken_last_reward_blocknum(pairBw.address)).to.eq(100)
      expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(0)
      expect(await Dao.swaptoken_allAmount(pairBw.address)).to.eq(0)
    }).timeout(30000000)

  //71
  it('change Erc Mint addr',async () => {
    const tokenA = await deployContract(wallet, XKeyToken)
    await Dao.changeMintErcAddr(tokenA.address)
    expect(await Dao.erc_mintaddr()).to.eq(tokenA.address)
  }).timeout(30000000)
*/
  //84
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


  it('AddLiquid to Mine without tokenId miner to myself',async () => {
    await addLiquidity(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    expect (await pairAB.balanceOf(1)).to.eq(expandTo18Decimals(10).sub(1000))
  }).timeout(30000000)

  it('AddLiquid to Mine with tokenId miner to myself',async () => {
    await addLiquidity(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidity(wallet,wallet,bigNumberify(1),expandTo18Decimals(10),expandTo18Decimals(10))
    expect (await pairAB.balanceOf(1)).to.eq(expandTo18Decimals(20).sub(1000))
  }).timeout(30000000)
  it('AddLiquid single card',async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("3")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    expect (await pairAB.balanceOf(1)).to.eq(expandTo18Decimals(10).sub(1000))
    await XKeySwaplpNft.setApprovalForAll(Dao.address,true)
    await Dao.addSwaptokenShareSingle(1)
    //expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(20)
    expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await xkeypower.swapTokenAllLiquid(pairAB.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await xkeypower.swapTokenSingleLength(pairAB.address)).to.eq(1)
    expect(await xkeypower.swapTokenCompositeLength(pairAB.address)).to.eq(0)
    expect(await Dao.swaptoken_allAmount(pairBw.address)).to.eq(0)
    expect(await Dao.swaptoken_pershare_reward(pairBw.address)).to.eq(0)
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    expect(await Dao.getUserShare(pairAB.address,wallet.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await Dao.getUserShare(pairBw.address,wallet.address)).to.eq(0)
    await xkeyrouter.addLiquidityETH(LPtokenB.address,expandTo18Decimals(10),0,0,1640970061,0,{
      ...overrides,
      value: expandTo18Decimals(10)
    })
    expect (await pairBw.balanceOf(2)).to.eq(expandTo18Decimals(10).sub(1000))
    await XKeySwaplpNft.setApprovalForAll(Dao.address,true)
    await Dao.addSwaptokenShareSingle(2)
    //expect(await Dao.swaptoken_last_reward_blocknum(LPtokenB.address)).to.eq(36)
    expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await Dao.swaptoken_allAmount(pairBw.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await xkeypower.swapTokenAllLiquid(pairAB.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await xkeypower.swapTokenAllLiquid(pairBw.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await xkeypower.swapTokenSingleLength(pairAB.address)).to.eq(1)
    expect(await xkeypower.swapTokenSingleLength(pairBw.address)).to.eq(1)
    expect(await xkeypower.swapTokenCompositeLength(pairAB.address)).to.eq(0)
    expect(await Dao.swaptoken_pershare_reward(pairBw.address)).to.eq(0)
    expect(await Dao.swaptoken_pershare_reward(pairAB.address)).to.eq(0)
    expect(await Dao.getUserShare(pairBw.address,wallet.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await Dao.getUserShare(pairAB.address,wallet.address)).to.eq(expandTo18Decimals(10).sub(1000))
  }).timeout(30000000)
  it('RemoveSwapToken',async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))

    await addLiquidity(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidity(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setApprovalForAll(Dao.address,true)
    console.log("pass 1")
    await Dao.addSwaptokenShareSingle(1)
    expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(expandTo18Decimals(10).sub(1000))
    expect(await Dao.getUserShare(pairAB.address,wallet.address)).to.eq(expandTo18Decimals(10).sub(1000))
    //await Dao.getSwaptokenReward(pairAB.address)
    await Dao.addSwaptokenShareSingle(2)
    //expect(await Dao.getUserShare(pairAB.address,wallet.address)).to.eq(expandTo18Decimals(20).sub(1000))
    await Dao.addSwaptokenShareSingle(3)
    expect(await Dao.getUserShare(pairBw.address,wallet.address)).to.eq(expandTo18Decimals(10).sub(1000))
    console.log("pass 4")
    await Dao.removeSwaptokenShareSingle(3)
    console.log("pass 5")
    const TokenShare = (bigNumberify(1*84*4/10*10+1*84*6*10/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 )).sub(8400)
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(TokenShare)
    console.log("pass 6")
    expect(await Dao.getUserShare(pairBw.address,wallet.address)).to.eq(expandTo18Decimals(0))
    await Dao.removeSwaptokenShareSingle(1)
    expect(await xkeypower.swapTokenAllLiquid(pairAB.address)).to.eq(expandTo18Decimals(10))
    expect(await xkeypower.swapTokenSingleLength(pairAB.address)).to.eq(1)
    expect(await xkeypower.swapTokenCompositeLength(pairAB.address)).to.eq(0)
    const TokenShareTwo = (bigNumberify(1*84*6*10/10+1*84*4*10/10+3*84*4*10/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 )).sub(13440)
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(TokenShareTwo)
    expect(await Dao.getUserShare(pairAB.address,wallet.address)).to.eq(expandTo18Decimals(10))
    await expect(Dao.removeSwaptokenShareSingle(1))
      .to.be.revertedWith('unstake: invalid power.')
  }).timeout(30000000)
  it('GetReward',async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))

    await addLiquidity(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidity(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await addLiquidityETH(wallet,wallet,expandTo18Decimals(0),expandTo18Decimals(10),expandTo18Decimals(10))
    await XKeySwaplpNft.setApprovalForAll(Dao.address,true)
    console.log("pass 1")
    await Dao.addSwaptokenShareSingle(1)
    await Dao.getSwaptokenReward(pairAB.address)
    await Dao.addSwaptokenShareSingle(2)
    await Dao.addSwaptokenShareSingle(3)
    await LPtokenB.transfer(other.address,expandTo18Decimals(1))
    expect(await Dao.predReward(pairBw.address)).to.eq(bigNumberify(1*84*6*10/10).mul(bigNumberify(10).pow(17)).sub(5040))
    await Dao.removeSwaptokenShareSingle(3)
    const TokenShare = (bigNumberify(2*84*4/10*10+2*84*6*10/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 )).sub(16800)
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(TokenShare)
    expect(await Dao.swaptoken_hadmint(pairAB.address)).to.eq(bigNumberify(2*84*4/10*10).mul(bigNumberify(10).pow(17)).sub(6720))
    expect(await Dao.swaptoken_hadmint(pairBw.address)).to.eq(bigNumberify(2*84*6/10*10).mul(bigNumberify(10).pow(17)).sub(16800-6720))
    console.log("pass 6")
  }).timeout(30000000)
  it('AddLiquid multi card',async () => {
    await Dao.createLiquidSwap(pairAB.address,4,1)
    await Dao.createLiquidSwap(pairBw.address,6,1)
    await LPtokenA.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(xkeyrouter.address,expandTo18Decimals(10000000))
    //expect (await xkeyFactory.getbytecode()).to.eq("0x7c1a53f2cc5489d73bccedfcb7c89a5e1c0bed7773f5b9cd328db1022c5a1af8")
    await xkeyrouter.addLiquidity(LPtokenA.address,LPtokenB.address,expandTo18Decimals(10),expandTo18Decimals(10),0,0,1640970061,0)
    await XKeySwaplpNft.setMinter(wallet.address)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 1, 2)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 2, 3)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 3, 4)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 4, 5)
    await XKeySwaplpNft.testMint(pairAB.address,nftowner.address, 2, 2)
    await XKeySwaplpNft.testMint(pairBw.address,nftowner.address, 2, 2)
    await XKeySwaplpNft.setMinter(xkeyrouter.address)
    console.log("pass")
    //await addLiquidity(nftowner,nftowner,bigNumberify(7),expandTo18Decimals(1),expandTo18Decimals(1))
    await addLiquidity(nftowner,nftowner,bigNumberify(6),expandTo18Decimals(1),expandTo18Decimals(1))
    await addLiquidity(nftowner,nftowner,bigNumberify(2),expandTo18Decimals(1),expandTo18Decimals(1))
    await addLiquidity(nftowner,nftowner,bigNumberify(3),expandTo18Decimals(1),expandTo18Decimals(1))
    await addLiquidity(nftowner,nftowner,bigNumberify(4),expandTo18Decimals(1),expandTo18Decimals(1))
    await addLiquidity(nftowner,nftowner,bigNumberify(5),expandTo18Decimals(1),expandTo18Decimals(1))
    console.log("pass")
    await XKeySwaplpNft.connect(nftowner).setApprovalForAll(Dao.address,true)
    await expect(Dao.connect(nftowner).addSwaptokenShareCombine([2,3,4,5,7]))
      .to.be.revertedWith('xkeydao:tokenids arent same pair')
    await Dao.connect(nftowner).addSwaptokenShareCombine([2,3,4,5,6])
    expect(await xkeypower.swapTokenAllLiquid(pairAB.address)).to.eq(expandTo18Decimals(5))
    expect(await xkeypower.swapTokenSingleLength(pairAB.address)).to.eq(0)
    expect(await xkeypower.swapTokenCompositeLength(pairAB.address)).to.eq(1)
    expect(await Dao.getUserShare(pairAB.address,nftowner.address)).to.eq(expandTo18Decimals(1).mul(5).mul(16+55))
    expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(expandTo18Decimals(1).mul(5).mul(16+55))
    await addLiquidity(nftowner,nftowner,bigNumberify(0),expandTo18Decimals(1),expandTo18Decimals(1))
    await Dao.connect(nftowner).addSwaptokenShareSingle(8)
    expect(await xkeypower.swapTokenAllLiquid(pairAB.address)).to.eq(expandTo18Decimals(6))
    expect(await xkeypower.swapTokenSingleLength(pairAB.address)).to.eq(1)
    expect(await xkeypower.swapTokenCompositeLength(pairAB.address)).to.eq(1)
    expect(await Dao.getUserShare(pairAB.address,nftowner.address)).to.eq(expandTo18Decimals(1).mul(5).mul(16+55).add(expandTo18Decimals(1)))
    expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(expandTo18Decimals(1).mul(5).mul(16+55).add(expandTo18Decimals(1)))
    await Dao.connect(nftowner).removeSwaptokenShareCombine(0)
    expect(await xkeypower.swapTokenAllLiquid(pairAB.address)).to.eq(expandTo18Decimals(1))
    expect(await xkeypower.swapTokenSingleLength(pairAB.address)).to.eq(1)
    expect(await xkeypower.swapTokenCompositeLength(pairAB.address)).to.eq(0)
    expect(await Dao.getUserShare(pairAB.address,nftowner.address)).to.eq(expandTo18Decimals(1))
    expect(await Dao.swaptoken_allAmount(pairAB.address)).to.eq(expandTo18Decimals(1))

  }).timeout(30000000)

  /*


  it('RemoveSwapToken',async () => {
    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Dao.createLiquidSwap(LPtokenA.address,4,50)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.RemoveSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    const TokenShare = (bigNumberify(2*41*6*10/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 ))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(TokenShare)
    expect(await LPtokenB.balanceOf(Dao.address)).to.eq(expandTo18Decimals(10))
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenB.address)).to.eq(50)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(50)
    expect(await Dao.getUserShare(LPtokenB.address,wallet.address)).to.eq(expandTo18Decimals(10))
    await Dao.RemoveSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    const TokenShareTwo = (bigNumberify(2*41*6*10/10+1*41*4*10/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 ))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(TokenShareTwo)
    expect(await LPtokenA.balanceOf(Dao.address)).to.eq(0)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(51)
    expect(await Dao.getUserShare(LPtokenB.address,wallet.address)).to.eq(expandTo18Decimals(10))
    await expect(Dao.RemoveSwaptokenShare(LPtokenA.address,SHARE_AMOUNT))
      .to.be.revertedWith('Dont Have Enough token to remove')
  })
  it('GetReward',async () => {
    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Dao.createLiquidSwap(LPtokenA.address,4,1)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(61)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    const TokenBPerShare = bigNumberify((66-61)*41*4/10).mul(bigNumberify(10).pow(11))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.getSwaptokenReward(LPtokenA.address)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(66)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(TokenBPerShare)
    const expectValueTemp =(bigNumberify(5*41*4*10/10 + 1*41*6*10/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 ))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValueTemp)
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.getSwaptokenReward(LPtokenA.address)
    const expectValueTempa =(bigNumberify(5*41*4*10/10 + 1*10*41*6/10+1*10*41*4/10+1*10*41*4/10/2).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 ))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValueTempa)
  })
  it('GetRewardComplex',async () => {
    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Dao.createLiquidSwap(LPtokenA.address,4,1)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.getSwaptokenReward(LPtokenA.address)
    //expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+5*41*4/10 + 1*41*6/10))
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.getSwaptokenReward(LPtokenA.address)
    //expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+5*41*4/10 + 1*41*6/10+1*41*4/10+1*41*4/10/2))
    await Dao.connect(other).getSwaptokenReward(LPtokenA.address)
    var tokenTemp = (bigNumberify(2*41*4*10/10/2).mul(bigNumberify(10).pow(17)))
    expect(await Dao.getAddrBalanceof(other.address)).to.eq(tokenTemp)
    await Dao.getSwaptokenReward(LPtokenA.address)
    tokenTemp = (bigNumberify(5*41*4*10/10 + 1*10*41*6/10+1*10*41*4/10+3*10*41*4/10/2).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000 ))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(tokenTemp)
  }).timeout(30000000)
  it('AddLiquid zero',async () => {
    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Dao.createLiquidSwap(LPtokenA.address,4,1)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(97)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    const TokenBPerShare = bigNumberify((5)*41*4/10).mul(bigNumberify(10).pow(11))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.AddSwaptokenShare(LPtokenA.address,0)
    expect(await Dao.swaptoken_last_reward_blocknum(LPtokenA.address)).to.eq(102)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(TokenBPerShare)
    var tokenTemp = (bigNumberify(5*10*41*4/10 + 1*10*41*6/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(tokenTemp)
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenA.address,0)
    tokenTemp = (bigNumberify(5*41*4*10/10 + 1*10*41*6/10+1*10*41*4/10+1*10*41*4/10/2).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(tokenTemp)
  }).timeout(30000000)
  it('CreateExistToken', async () => {
    await Dao.createLiquidSwap(LPtokenA.address,4,20)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await expect(Dao.createLiquidSwap(LPtokenB.address,6,1))
      .to.be.revertedWith('Token exist')
  })
  it('ChangeWeight', async () => {
    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Dao.createLiquidSwap(LPtokenA.address,4,1)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    const TokenBPerShare = bigNumberify((5)*41*10*4/10).mul(bigNumberify(10).pow(10))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.AddSwaptokenShare(LPtokenA.address,0)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(TokenBPerShare)
    var expectValue = (bigNumberify(5*41*4*10/10 + 1*41*10*6/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValue)
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenA.address,0)
    expectValue = (bigNumberify(5*41*4*10/10 + 1*10*41*6/10+1*10*41*4/10+1*10*41*4/10/2).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValue)
    //await Dao.changeSwaptokenWeight(LPtokenA.address,24)
    const tx = await Dao.changeSwaptokenWeight(LPtokenA.address,24)
    const receipt = await tx.wait()
    console.log(receipt.gasUsed)
    await Dao.AddSwaptokenShare(LPtokenA.address,0)
    expectValue = (bigNumberify(5*41*10*4/10 + 1*10*41*6/10+1*10*41*4/10+2*10*41*4/10/2+1*10*41*24/30/2).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValue)
  }).timeout(30000000)
  it('PreReward',async () => {
    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Dao.createLiquidSwap(LPtokenA.address,4,1)
    await Dao.createLiquidSwap(LPtokenB.address,6,1)
    await LPtokenA.approve(Dao.address,expandTo18Decimals(10000000))
    await LPtokenB.approve(Dao.address,expandTo18Decimals(10000000))
    await Dao.AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await Dao.AddSwaptokenShare(LPtokenB.address,SHARE_AMOUNT)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenA.connect(other).approve(Dao.address,expandTo18Decimals(10000000))
    const TokenBPerShare = bigNumberify((66-61)*41*10*4/10).mul(bigNumberify(10).pow(10))
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(0)
    await Dao.getSwaptokenReward(LPtokenA.address)
    expect(await Dao.swaptoken_pershare_reward(LPtokenA.address)).to.eq(TokenBPerShare)
    var expectValue = (bigNumberify(5*41*4*10/10 + 1*10*41*6/10).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValue)
    await Dao.connect(other).AddSwaptokenShare(LPtokenA.address,SHARE_AMOUNT)
    await LPtokenA.transfer(other.address,expandTo18Decimals(2000))
    expectValue = bigNumberify(3*10*41*4/10/2).mul(bigNumberify(10).pow(17))
    expect(await Dao.predReward(LPtokenA.address)).to.eq(expectValue)
    console.log("dd")
    await Dao.getSwaptokenReward(LPtokenA.address)
    expectValue = (bigNumberify(5*41*4*10/10 + 1*10*41*6/10+1*10*41*4/10+2*10*41*4/10/2).mul(bigNumberify(10).pow(17))).add(expandTo18Decimals(400000000))
    expect(await Dao.getAddrBalanceof(wallet.address)).to.eq(expectValue)
  })
  it('MintAll', async () => {
    var LPtokenAa = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    var LPtokenBa = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    var xkeytokenc = await deployContract(wallet, XKeyToken)
    var Daoc = await deployContract(wallet,XKeyDao,[xkeytokenc.address,5000000])
    await xkeytokenc.setMintContract(Daoc.address,expandTo18Decimals(50000000))

    const SHARE_AMOUNT = expandTo18Decimals(10)
    await Daoc.createLiquidSwap(LPtokenAa.address,4,1)
    await Daoc.createLiquidSwap(LPtokenBa.address,6,1)
    await LPtokenAa.approve(Daoc.address,expandTo18Decimals(10000000))
    await LPtokenBa.approve(Daoc.address,expandTo18Decimals(10000000))
    await Daoc.AddSwaptokenShare(LPtokenAa.address,SHARE_AMOUNT)
    await Daoc.AddSwaptokenShare(LPtokenBa.address,SHARE_AMOUNT)
    await Daoc.AddSwaptokenShare(LPtokenBa.address,SHARE_AMOUNT)
    await LPtokenAa.transfer(other.address,expandTo18Decimals(2000))
    await LPtokenAa.connect(other).approve(Daoc.address,expandTo18Decimals(10000000))
    const TokenBPerShare = bigNumberify((5)*5000000*4/10).mul(bigNumberify(10).pow(11))
    expect(await Daoc.swaptoken_pershare_reward(LPtokenAa.address)).to.eq(0)
    await Daoc.AddSwaptokenShare(LPtokenAa.address,0)
    expect(await Daoc.swaptoken_pershare_reward(LPtokenAa.address)).to.eq(TokenBPerShare)
    expect(await Daoc.getAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+5*5000000*4/10 + 1*5000000*6/10))
    await Daoc.connect(other).AddSwaptokenShare(LPtokenAa.address,SHARE_AMOUNT)
    await Daoc.AddSwaptokenShare(LPtokenAa.address,0)
    expect(await Daoc.getAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+5*5000000*4/10 + 1*5000000*6/10+1*5000000*4/10+1*5000000*4/10/2))
    await Daoc.changeSwaptokenWeight(LPtokenAa.address,24)
    //expect(await Daoc.predReward(LPtokenAa.address)).to.eq(expandTo18Decimals(20))
    await Daoc.getSwaptokenReward(LPtokenAa.address)
    expect(await Daoc.getAddrBalanceof(wallet.address)).to.eq(expandTo18Decimals(400000000+5*5000000*4/10 + 1*5000000*6/10+1*5000000*4/10+2*5000000*4/10/2+1*5000000*24/30/2))
    await Daoc.AddSwaptokenShare(LPtokenAa.address,0)
    await Daoc.AddSwaptokenShare(LPtokenBa.address,0)
    await Daoc.connect(other).AddSwaptokenShare(LPtokenBa.address,0)
    await Daoc.AddSwaptokenShare(LPtokenAa.address,0)
    await Daoc.AddSwaptokenShare(LPtokenBa.address,0)
    await expect(Daoc.AddSwaptokenShare(LPtokenAa.address,8))
      .to.be.revertedWith('All token has been mint')
    await Daoc.RemoveSwaptokenShare(LPtokenBa.address,SHARE_AMOUNT)
    await Daoc.RemoveSwaptokenShare(LPtokenBa.address,SHARE_AMOUNT)
    await Daoc.RemoveSwaptokenShare(LPtokenAa.address,SHARE_AMOUNT)
    expect(await LPtokenAa.balanceOf(wallet.address)).to.eq(expandTo18Decimals(400000000+600000-2000))
    expect(await LPtokenBa.balanceOf(wallet.address)).to.eq(expandTo18Decimals(400000000+600000))
  }).timeout(30000000)
  /*
  it('ChangeWeight', async () => {
      for(var i = 0;i < 100;i++){
          var LPtokenTemp = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
          const tx = await Dao.createLiquidSwap(LPtokenTemp.address,5,1)
          const receipt = await tx.wait()
          console.log(receipt.gasUsed)
      }
      await Dao.createLiquidSwap(LPtokenA.address,5,1)
      const tx = await Dao.changeSwaptokenWeight(LPtokenA.address,20)
      const receipt = await tx.wait()
      console.log(receipt.gasUsed)
  }).timeout(30000000)

   */
})
