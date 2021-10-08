import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes } from 'ethers/utils'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'

import XKeyToken from '../build/XKeyToken.json'

chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(1000000000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('XKeyToken', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let token: Contract
  beforeEach(async () => {
    token = await deployContract(wallet, XKeyToken)
  })

  it('init', async () => {
    const name = await token.name()
    expect(name).to.eq('XKEY')
    expect(await token.symbol()).to.eq('XKEY')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(expandTo18Decimals(400000000))
    expect(await token.balanceOf(wallet.address)).to.eq(expandTo18Decimals(400000000))
    expect(await token.owner()).to.eq(wallet.address)
  })

  it('miner', async () => {
    await expect(token.connect(other).setMintContract(other.address, 100000)).to.be.revertedWith('for contract owner only')
    await token.setMintContract(other.address, 1000000)
    await token.connect(other).minerMint(other.address, 100)
    expect(await token.balanceOf(other.address)).to.eq(100)
    expect(await token.totalSupply()).to.eq(expandTo18Decimals(400000000).add(100))
    await token.connect(other).minerMint(other.address, 1000001)
    expect(await token.balanceOf(other.address)).to.eq(1000000)
    expect(await token.totalSupply()).to.eq(expandTo18Decimals(400000000).add(1000000))
  })

  it('approve', async () => {
    await expect(token.approve(other.address, TEST_AMOUNT))
      .to.emit(token, 'Approval')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
  })

  it('transferFrom', async () => {
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
        .to.be.revertedWith('ds-math-sub-underflow')
    await token.approve(other.address, TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
        .to.emit(token, 'Transfer')
        .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
    expect(await token.balanceOf(wallet.address)).to.eq(expandTo18Decimals(400000000).sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
        .to.be.revertedWith('ds-math-sub-underflow')
  })

  it('changeOwner', async () => {
    await token.changeOwner(other.address)
    expect(await token.owner()).to.eq(other.address)
    //await token.connect(other.address).setMintContract(wallet.address, 1000000)
  })

  it('transfer', async () => {
    await expect(token.transfer(other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.balanceOf(wallet.address)).to.eq(expandTo18Decimals(400000000).sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })

  it('transfer:fail', async () => {
    //await expect(token.transfer(other.address, expandTo18Decimals(1))).to.be.reverted // ds-math-sub-underflow
    await expect(token.connect(other).transfer(wallet.address, 1)).to.be.reverted // ds-math-sub-underflow
    await token.transfer(other.address, TEST_AMOUNT)
    await expect(token.connect(other).transfer(wallet.address, TEST_AMOUNT.add(1))).to.be.reverted // ds-math-sub-underflow
  })

  it('transferFrom:moreTimes', async () => {
    await token.approve(other.address, TEST_AMOUNT.add(TEST_AMOUNT))
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
    .to.emit(token, 'Transfer')
    .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(TEST_AMOUNT)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
    .to.emit(token, 'Transfer')
    .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(0)
  })

  it('transferFrom:max', async () => {
    await token.approve(other.address, MaxUint256)
    await expect(token.connect(other).transferFrom(wallet.address, other.address, TEST_AMOUNT))
      .to.emit(token, 'Transfer')
      .withArgs(wallet.address, other.address, TEST_AMOUNT)
    expect(await token.allowance(wallet.address, other.address)).to.eq(MaxUint256)
    expect(await token.balanceOf(wallet.address)).to.eq(expandTo18Decimals(400000000).sub(TEST_AMOUNT))
    expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  })
})
