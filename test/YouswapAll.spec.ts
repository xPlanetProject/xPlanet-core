import chai, { expect } from 'chai'
import { Contract, Wallet } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { AddressZero } from 'ethers/constants'
import { bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import { mineBlock} from './shared/utilities'
import { getCreate2Address } from './shared/utilities'
import { factoryFixture,factoryFixtureAll,InventoryFixture} from './shared/fixtures'
import ERC20 from '../build/ERC20.json'
import YouswapPair from '../build/YouswapPair.json'
import InvitationRelationShip from '../build/InvitationRelationShip.json'
import YouswapRouter from '../build/YouswapRouter.json'
chai.use(solidity)

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
]
const overrides = {
  gasLimit: 9999999
}

describe('All', () => {
  let accounts : { balance: string; secretKey: string; }[] = []
  for (var i = 0;i < 502;i++){
          var wallet = Wallet.createRandom();
          let account = {balance: '100000000000000000000000', secretKey: wallet.privateKey}
        accounts.push(account)
  }

  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999,
     accounts: accounts
  })
  let x  : Wallet[] = []
  for(var i = 0;i < 502;i++){
    let c = provider.getWallets()[i]
    x.push(c)
  }
  let factory: Contract
    let erc:Contract
  const loadFixture = createFixtureLoader(provider,x)

  beforeEach(async () => {
    const fixture = await loadFixture(InventoryFixture)
    factory = fixture.factory
      erc = fixture.erc
  })


    it ('Invitation init',async ()=>{
        const delegate = await deployContract(x[0], InvitationRelationShip)
        await factory.changeDelegate(delegate.address)
        await delegate.set_dao_contract_address(factory.address)
        await delegate.connect(x[0]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        await delegate.connect(x[1]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        for(var i = 2;i < 252;i++){
            await delegate.connect(x[i]).add_invitation_relation(x[i - 1].address)
        }
        for(var i = 252;i < 502;i++){
             await delegate.connect(x[i]).add_invitation_relation(x[200].address)
        }
        //check root
        const tx = await delegate.getDelegateRewardRanks(x[1].address)
        expect(tx[0][0]).to.eq('0x00000000000000000000000000000000000000ff')
        expect(tx[0][1]).to.eq(15)
        expect(tx[1][0]).to.eq('0x0000000000000000000000000000000000000000')
        expect(tx[1][1]).to.eq(0)
        expect(tx[2][0]).to.eq('0x0000000000000000000000000000000000000000')
        expect(tx[2][1]).to.eq(0)
        //check first round
        const tx2 = await delegate.getDelegateRewardRanks(x[2].address)
        expect(tx2[0][0]).to.eq(x[1].address)
        expect(tx2[0][1]).to.eq(15)
        expect(tx2[1][0]).to.eq('0x00000000000000000000000000000000000000ff')
        expect(tx2[1][1]).to.eq(10)
        expect(tx2[2][0]).to.eq('0x0000000000000000000000000000000000000000')
        expect(tx2[2][1]).to.eq(0)
        //check second root
        const tx1 = await delegate.getDelegateRewardRanks(x[200].address)
        expect(tx1[0][0]).to.eq(x[199].address)
        expect(tx1[0][1]).to.eq(15)
        expect(tx1[1][0]).to.eq(x[198].address)
        expect(tx1[1][1]).to.eq(10)
        expect(tx1[2][0]).to.eq(x[197].address)
        expect(tx1[2][1]).to.eq(5)
        //check second root
        const tx3 = await delegate.getDelegateRewardRanks(x[501].address)
        expect(tx3[0][0]).to.eq(x[200].address)
        expect(tx3[0][1]).to.eq(15)
        expect(tx3[1][0]).to.eq(x[199].address)
        expect(tx3[1][1]).to.eq(10)
        expect(tx3[2][0]).to.eq(x[198].address)
        expect(tx3[2][1]).to.eq(5)
    }).timeout(300000)

    it ('Invitation ALL with 0',async ()=>{
        const delegate = await deployContract(x[0], InvitationRelationShip)
        await factory.changeDelegate(delegate.address)
        await delegate.set_dao_contract_address(factory.address)
        await delegate.connect(x[0]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        await delegate.connect(x[1]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        for(var i = 2;i < 252;i++){
            await delegate.connect(x[i]).add_invitation_relation(x[i - 1].address)
        }
        for(var i = 252;i < 502;i++){
             await delegate.connect(x[i]).add_invitation_relation(x[200].address)
        }
        const expectedLiquidity =  bigNumberify('99999999999999999900')
        const tokenA = await deployContract(x[452], ERC20, [expandTo18Decimals(1000000)])
        const tokenB = await deployContract(x[452], ERC20, [expandTo18Decimals(1000000)])
        const pair = await deployContract(x[0], YouswapPair)
        await pair.initialize(tokenA.address, tokenB.address, factory.address)
        await factory.createPair(pair.address)
        await factory.changeWeight(pair.address,100)
        //await expect(delegate.register_root_member()).to.emit(delegate, 'RegisterRootMember').withArgs(other.address)
         //await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
       // await expect(delegate.connect(wallet).add_invitation_relation(other.address)).to.emit(delegate, 'AddRelation').withArgs(wallet.address, other.address)
        const router = await deployContract(x[0], YouswapRouter, [factory.address, tokenA.address])
        const approveAmount = expandTo18Decimals(500000)
        const liquidityAmount = expandTo18Decimals(5)
        await tokenA.connect(x[452]).approve(router.address, approveAmount)
        await tokenB.connect(x[452]).approve(router.address, approveAmount)
        let j: number
        for (j=0; j < 200; j++) {
            await expect(router.connect(x[452]).addLiquidity(tokenA.address, tokenB.address, liquidityAmount, liquidityAmount, 0, 0, MaxUint256))
        .to.emit(pair, 'Mint')
        }
        const tx = await factory.connect(x[452]).getReward(pair.address)
        expect (await erc.balanceOf(x[452].address)).to.eq(expectedLiquidity)
        expect (await erc.balanceOf(x[200].address)).to.eq(0)
        expect (await erc.balanceOf(x[199].address)).to.eq(0)
        expect (await erc.balanceOf(x[198].address)).to.eq(0)
        const receipt = await tx.wait()
        console.log(receipt.gasUsed)
    }).timeout(2400000)
    it ('Invitation ALL without 0',async ()=>{
        const delegate = await deployContract(x[0], InvitationRelationShip)
        await factory.changeDelegate(delegate.address)
        await delegate.set_dao_contract_address(factory.address)
        await delegate.connect(x[0]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        await delegate.connect(x[1]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        for(var i = 2;i < 252;i++){
            await delegate.connect(x[i]).add_invitation_relation(x[i - 1].address)
        }
        for(var i = 252;i < 502;i++){
             await delegate.connect(x[i]).add_invitation_relation(x[200].address)
        }
        const expectedLiquidity1 =  bigNumberify('1499999999999999974')
        const expectedLiquidity =  bigNumberify('101999999999999999870')
        const tokenA = await deployContract(x[452], ERC20, [expandTo18Decimals(1000000)])
        const tokenB = await deployContract(x[452], ERC20, [expandTo18Decimals(1000000)])
        const pair = await deployContract(x[0], YouswapPair)
        await pair.initialize(tokenA.address, tokenB.address, factory.address)
        await factory.createPair(pair.address)
        await factory.changeWeight(pair.address,100)
        //await expect(delegate.register_root_member()).to.emit(delegate, 'RegisterRootMember').withArgs(other.address)
         //await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
       // await expect(delegate.connect(wallet).add_invitation_relation(other.address)).to.emit(delegate, 'AddRelation').withArgs(wallet.address, other.address)
        const router = await deployContract(x[0], YouswapRouter, [factory.address, tokenA.address])
        const approveAmount = expandTo18Decimals(500000)
        const liquidityAmount = expandTo18Decimals(5)
        await tokenA.connect(x[452]).approve(router.address, approveAmount)
        await tokenB.connect(x[452]).approve(router.address, approveAmount)
        let j: number
        for (j=0; j < 200; j++) {
            await expect(router.connect(x[452]).addLiquidity(tokenA.address, tokenB.address, liquidityAmount, liquidityAmount, 0, 0, MaxUint256))
        .to.emit(pair, 'Mint')
            if(j == 2){
                await factory.connect(x[452]).getReward(pair.address)
                expect (await erc.balanceOf(x[452].address)).to.eq(expectedLiquidity1)
                await erc.connect(x[452]).transfer(x[200].address,1)
                await erc.connect(x[452]).transfer(x[199].address,1)
                await erc.connect(x[452]).transfer(x[198].address,1)
            }
        }

        const tx = await factory.connect(x[452]).getReward(pair.address)
        expect (await erc.balanceOf(x[452].address)).to.eq(bigNumberify(expectedLiquidity))
        expect (await erc.balanceOf(x[200].address)).to.eq(bigNumberify(expectedLiquidity).sub(expectedLiquidity1).mul(15).div(100).add(1))
        expect (await erc.balanceOf(x[199].address)).to.eq(bigNumberify(expectedLiquidity).sub(expectedLiquidity1).mul(10).div(100).add(1))
        expect (await erc.balanceOf(x[198].address)).to.eq(bigNumberify(expectedLiquidity).sub(expectedLiquidity1).mul(5).div(100).add(1))
        const receipt = await tx.wait()
        console.log(receipt.gasUsed)
    }).timeout(2400000)
    it ('Invitation ALL other',async ()=>{
        const delegate = await deployContract(x[0], InvitationRelationShip)
        await factory.changeDelegate(delegate.address)
        await delegate.set_dao_contract_address(factory.address)
        await delegate.connect(x[0]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        await delegate.connect(x[1]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        for(var i = 2;i < 12;i++){
            await delegate.connect(x[i]).add_invitation_relation(x[i - 1].address)
        }
        const expectedLiquidity = expandTo18Decimals(201)
        const tokenA = await deployContract(x[7], ERC20, [expandTo18Decimals(1000000)])
        const tokenB = await deployContract(x[7], ERC20, [expandTo18Decimals(1000000)])
        const pair = await deployContract(x[0], YouswapPair)
        await pair.initialize(tokenA.address, tokenB.address, factory.address)
        await factory.createPair(pair.address)
        await factory.changeWeight(pair.address,100)
        //await expect(delegate.register_root_member()).to.emit(delegate, 'RegisterRootMember').withArgs(other.address)
         //await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
       // await expect(delegate.connect(wallet).add_invitation_relation(other.address)).to.emit(delegate, 'AddRelation').withArgs(wallet.address, other.address)
        const router = await deployContract(x[0], YouswapRouter, [factory.address, tokenA.address])
        const approveAmount = expandTo18Decimals(500000)
        const transferAmount = expandTo18Decimals(5000)
        const liquidityAmount = expandTo18Decimals(5)
        const liquidityAmount2 = expandTo18Decimals(50)
        await tokenA.connect(x[7]).approve(router.address, approveAmount)
        await tokenB.connect(x[7]).approve(router.address, approveAmount)
        await tokenA.connect(x[7]).transfer(x[6].address,transferAmount)
        await tokenB.connect(x[7]).transfer(x[6].address,transferAmount)
        await tokenA.connect(x[6]).approve(router.address, transferAmount)
        await tokenB.connect(x[6]).approve(router.address, transferAmount)
        await expect(router.connect(x[6]).addLiquidity(tokenA.address, tokenB.address, liquidityAmount, liquidityAmount, 0, 0, MaxUint256))
        .to.emit(pair, 'Mint')
        let j: number
        for (j=0; j < 200; j++) {
            await expect(router.connect(x[7]).addLiquidity(tokenA.address, tokenB.address, liquidityAmount, liquidityAmount, 0, 0, MaxUint256))
        .to.emit(pair, 'Mint')
            if(j == 2){
                await factory.connect(x[7]).getReward(pair.address)
                expect (await erc.balanceOf(x[7].address)).to.eq(expectedLiquidity)
                erc.connect(x[7]).transfer(x[6].address,1)
                erc.connect(x[7]).transfer(x[5].address,1)
                erc.connect(x[7]).transfer(x[4].address,1)
            }
        }
        const tx = await factory.connect(x[6]).getReward(pair.address)
        const receipt = await tx.wait()
        console.log(receipt.gasUsed)
        //const tx = await factory.getReward(pair.address)
        const old_expect = expectedLiquidity.div(bigNumberify(1050)).mul(bigNumberify(50))
        const new_expect = bigNumberify(expectedLiquidity).div(bigNumberify(1050)).mul(bigNumberify(1000)).div(bigNumberify(10)).add(old_expect)
        expect (await erc.balanceOf(x[6].address)).to.eq(old_expect)
        //expect (await erc.balanceOf(x[451].address)).to.eq(expectedLiquidity1)
        expect (await erc.balanceOf(x[5].address)).to.eq(bigNumberify(old_expect).mul(bigNumberify(15)).div(bigNumberify(100)))
        expect (await erc.balanceOf(x[4].address)).to.eq(bigNumberify(old_expect).div(bigNumberify(10)))
        expect (await erc.balanceOf(x[3].address)).to.eq(bigNumberify(old_expect).div(bigNumberify(20)))
        await factory.connect(x[7]).getReward(pair.address)
        expect (await erc.balanceOf(x[7].address)).to.eq(expectedLiquidity)
        expect (await erc.balanceOf(x[6].address)).to.eq(new_expect)
    }).timeout(2400000)
    it ('Invitation ALL other',async ()=>{
        const delegate = await deployContract(x[0], InvitationRelationShip)
        await factory.changeDelegate(delegate.address)
        await delegate.set_dao_contract_address(factory.address)
        await delegate.connect(x[0]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        await delegate.connect(x[1]).add_invitation_relation("0x00000000000000000000000000000000000000ff")
        for(var i = 2;i < 252;i++){
            await delegate.connect(x[i]).add_invitation_relation(x[i - 1].address)
        }
        for(var i = 252;i < 502;i++){
             await delegate.connect(x[i]).add_invitation_relation(x[200].address)
        }
        const expectedLiquidity = bigNumberify('102120024875621835041')
        const expectedLiquidity1 = bigNumberify('1125000000000000045')
        const tokenA = await deployContract(x[452], ERC20, [expandTo18Decimals(1000000)])
        const tokenB = await deployContract(x[452], ERC20, [expandTo18Decimals(1000000)])
        const pair = await deployContract(x[0], YouswapPair)
        await pair.initialize(tokenA.address, tokenB.address, factory.address)
        await factory.createPair(pair.address)
        await factory.changeWeight(pair.address,100)
        //await expect(delegate.register_root_member()).to.emit(delegate, 'RegisterRootMember').withArgs(other.address)
         //await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
       // await expect(delegate.connect(wallet).add_invitation_relation(other.address)).to.emit(delegate, 'AddRelation').withArgs(wallet.address, other.address)
        const router = await deployContract(x[0], YouswapRouter, [factory.address, tokenA.address])
        const approveAmount = expandTo18Decimals(500000)
        const transferAmount = expandTo18Decimals(5000)
        const liquidityAmount = expandTo18Decimals(5)
        const liquidityAmount2 = expandTo18Decimals(50)
        await tokenA.connect(x[452]).approve(router.address, approveAmount)
        await tokenB.connect(x[452]).approve(router.address, approveAmount)
        await tokenA.connect(x[452]).transfer(x[451].address,transferAmount)
        await tokenB.connect(x[452]).transfer(x[451].address,transferAmount)
        await tokenA.connect(x[451]).approve(router.address, transferAmount)
        await tokenB.connect(x[451]).approve(router.address, transferAmount)
        await expect(router.connect(x[451]).addLiquidity(tokenA.address, tokenB.address, liquidityAmount, liquidityAmount, 0, 0, MaxUint256))
        .to.emit(pair, 'Mint')
        let j: number
        for (j=0; j < 200; j++) {
            await expect(router.connect(x[452]).addLiquidity(tokenA.address, tokenB.address, liquidityAmount, liquidityAmount, 0, 0, MaxUint256))
        .to.emit(pair, 'Mint')
            if(j == 2){
                await factory.connect(x[452]).getReward(pair.address)
                expect (await erc.balanceOf(x[452].address)).to.eq(expectedLiquidity1)
                await erc.connect(x[452]).transfer(x[200].address,1)
                await erc.connect(x[452]).transfer(x[199].address,1)
                await erc.connect(x[452]).transfer(x[198].address,1)
                await erc.connect(x[452]).transfer(x[197].address,1)
            }
        }
        const tx = await factory.connect(x[451]).getReward(pair.address)
        const receipt = await tx.wait()
        console.log(receipt.gasUsed)
        //const tx = await factory.getReward(pair.address)
        const old_expect = bigNumberify('512437810945273247')
        const new_expect = bigNumberify('15226119402985066238')

        expect (await erc.balanceOf(x[451].address)).to.eq(old_expect)
        //expect (await erc.balanceOf(x[451].address)).to.eq(expectedLiquidity1)
        expect (await erc.balanceOf(x[200].address)).to.eq(bigNumberify(old_expect).mul(bigNumberify(15)).div(bigNumberify(100)).add(1))
        expect (await erc.balanceOf(x[199].address)).to.eq(bigNumberify(old_expect).div(bigNumberify(10)).add(1))
        expect (await erc.balanceOf(x[198].address)).to.eq(bigNumberify(old_expect).div(bigNumberify(20)).add(1))
        await factory.connect(x[452]).getReward(pair.address)
        expect (await erc.balanceOf(x[452].address)).to.eq(expectedLiquidity)
        expect (await erc.balanceOf(x[200].address)).to.eq(new_expect)
    }).timeout(2400000)
})
