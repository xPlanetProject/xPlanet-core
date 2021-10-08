import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes } from 'ethers/utils'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'

import XPlanetPoker from '../build/XPlanetPoker.json'
import XKeyToken from '../build/XKeyToken.json'

chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(1000000000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('XPlanetPoker', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, fund, other] = provider.getWallets()

  let token: Contract
  let poker: Contract
  beforeEach(async () => {
    token = await deployContract(wallet, XKeyToken)
    poker = await deployContract(wallet, XPlanetPoker, [token.address, fund.address])
  })

  it('init', async () => {
    const name = await poker.name()
    expect(name).to.eq('XPOKER')
    expect(await poker.symbol()).to.eq('XPK')
    expect(await poker.maxCardNum()).to.eq(52*200)
    expect(await poker.totalSupply()).to.eq(0)
    expect(await poker.baseTokenURI()).to.eq("http://poker.xplanet.io/")
  })

  it('mint1', async () => {
    await expect(poker.openLootBox(0)).to.be.revertedWith('Count should > 0.')
    await expect(poker.connect(other).openLootBox(1)).to.be.revertedWith('Not enough XKey to mint.')
    await expect(poker.openLootBox(6)).to.be.revertedWith('Limit to maximum 5 mints.')
    await token.approve(poker.address, expandTo18Decimals(10000))
    await poker.openLootBox(1)
    expect(await poker.tokenURI(1)).to.eq("http://poker.xplanet.io/1")
    expect(await poker.ownerOf(1)).to.eq(wallet.address)
  })

  it('mint5', async () => {
    await token.approve(poker.address, expandTo18Decimals(10000))
    await poker.openLootBox(5)
    expect(await poker.tokenURI(1)).to.eq("http://poker.xplanet.io/1")
    expect(await poker.ownerOf(5)).to.eq(wallet.address)
  })

  it('mintMax', async () => {
    await token.approve(poker.address, expandTo18Decimals(1040000))
    for (var i=0; i<2080; i++) {
        await poker.openLootBox(5)
    }
    expect(await poker.tokenURI(1)).to.eq("http://poker.xplanet.io/1")
    expect(await poker.ownerOf(10400)).to.eq(wallet.address)
    await expect(poker.openLootBox(1)).to.be.revertedWith('No more poker.')
  }).timeout(30000000)

  it('revoke', async () => {
    await token.transfer(other.address, expandTo18Decimals(1000))
    expect(await token.balanceOf(other.address)).to.eq(expandTo18Decimals(1000))
    await token.connect(other).approve(poker.address, expandTo18Decimals(100000))
    await poker.connect(other).openLootBox(5)
    expect(await token.balanceOf(other.address)).to.eq(expandTo18Decimals(500))
    expect(await token.balanceOf(fund.address)).to.eq(expandTo18Decimals(475))
    await token.transfer(poker.address, expandTo18Decimals(1000))
    await poker.connect(other).revokePoker([1,0, 0, 0, 2])
    expect(await token.balanceOf(other.address)).to.eq(expandTo18Decimals(540))
    await token.transfer(poker.address, expandTo18Decimals(960))
  })
})
