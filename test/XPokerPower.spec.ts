import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes } from 'ethers/utils'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'

import XSwapLPNFT from '../build/XSwapLPNFT.json'
import MockPairERC20 from '../build/MockPairERC20.json'
import XPokerPower from '../build/XPokerPower.json'

chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(1000000000)
const TEST_AMOUNT = bigNumberify(1)

describe('XPokerPower', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let token: Contract
  let lp: Contract
  let power: Contract
  beforeEach(async () => {
    token = await deployContract(wallet, MockPairERC20)
    lp = await deployContract(wallet, XSwapLPNFT)
    await lp.setMinter(wallet.address)
    power = await deployContract(wallet, XPokerPower, [lp.address])
  })

  it('stake', async () => {
    await lp.mintUniqueTokenTo(token.address, wallet.address)
    for (let i=0; i<10; i++) {
        await lp.mintUniqueTokenTo(token.address, wallet.address)
    }
    await lp.openLootBox(1)
    let property = await lp.getPokerProperty(1)
    console.log(property.rank)
    console.log(property.suit)
    await expect(power.stake(wallet.address, token.address, 1)).to.be.revertedWith('stake: zero power.')
    await token.mint(1, TEST_AMOUNT)
    expect(await token.balanceOf(1)).to.eq(TEST_AMOUNT)
    await power.stake(wallet.address, token.address, 1)
    expect(await power.getTokenIdByIndex(wallet.address, 0)).to.eq(1)
    expect(await power.getSinglePowerdByIndex(wallet.address, 0)).to.eq(property.rank.mul(TEST_AMOUNT))
  })

  it('stakeDuplicated', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 2)
    await lp.testMint(wallet.address, 3, 2)
    await lp.testMint(wallet.address, 4, 2)
    await lp.testMint(wallet.address, 1, 2)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await expect(power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])).to.be.revertedWith('stakeComposite: Cannot add same poker.')
  })

  it('stakeHighCard', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 3)
    await lp.testMint(wallet.address, 3, 4)
    await lp.testMint(wallet.address, 4, 5)
    await lp.testMint(wallet.address, 2, 7)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(21+15))
  })

  it('stakeOnePair', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 3)
    await lp.testMint(wallet.address, 3, 4)
    await lp.testMint(wallet.address, 4, 5)
    await lp.testMint(wallet.address, 2, 2)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(16+55))
  })

  it('stakeTwoPair', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 3)
    await lp.testMint(wallet.address, 3, 4)
    await lp.testMint(wallet.address, 4, 2)
    await lp.testMint(wallet.address, 1, 3)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(14+110))
  })

  it('stakeThree', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 3)
    await lp.testMint(wallet.address, 3, 4)
    await lp.testMint(wallet.address, 4, 3)
    await lp.testMint(wallet.address, 1, 3)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(15+165))
  })

  it('stakeFullHouse', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 3)
    await lp.testMint(wallet.address, 3, 3)
    await lp.testMint(wallet.address, 4, 2)
    await lp.testMint(wallet.address, 1, 3)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(13+335))
  })

  it('stakeFour', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 2)
    await lp.testMint(wallet.address, 3, 3)
    await lp.testMint(wallet.address, 4, 2)
    await lp.testMint(wallet.address, 3, 2)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(11+395))
  })

  it('stakeStraight', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 3)
    await lp.testMint(wallet.address, 4, 5)
    await lp.testMint(wallet.address, 1, 6)
    await lp.testMint(wallet.address, 3, 4)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(20+215))
  })

  it('stakeFlush', async () => {
    await lp.testMint(wallet.address, 1, 7)
    await lp.testMint(wallet.address, 1, 4)
    await lp.testMint(wallet.address, 1, 3)
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 1, 5)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(21+275))
  })

  it('stakeStraightFlush', async () => {
    await lp.testMint(wallet.address, 2, 10)
    await lp.testMint(wallet.address, 2, 9)
    await lp.testMint(wallet.address, 2, 13)
    await lp.testMint(wallet.address, 2, 11)
    await lp.testMint(wallet.address, 2, 12)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(55+455))
  })

  it('stakeRoyalFlush', async () => {
    await lp.testMint(wallet.address, 1, 10)
    await lp.testMint(wallet.address, 1, 14)
    await lp.testMint(wallet.address, 1, 13)
    await lp.testMint(wallet.address, 1, 11)
    await lp.testMint(wallet.address, 1, 12)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(60+1000))
  })

  it('unstake', async () => {
    await lp.testMint(wallet.address, 1, 2)
    await lp.testMint(wallet.address, 2, 9)
    await lp.testMint(wallet.address, 2, 13)
    await lp.testMint(wallet.address, 2, 11)
    await lp.testMint(wallet.address, 2, 12)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await power.stake(wallet.address, token.address, 3)
    await power.stake(wallet.address, token.address, 4)
    expect(await power.getTokenIdByIndex(wallet.address, 0)).to.eq(3)
    expect(await power.getSinglePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(13))
    await power.unstake(wallet.address, 3);
    expect(await power.getTokenIdByIndex(wallet.address, 0)).to.eq(4)
    expect(await power.getSinglePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(11))
    await expect(power.getTokenIdByIndex(wallet.address, 1)).to.be.revertedWith('getTokenIdByIndex: invalid index.')
  })

  it('unstakeComposite', async () => {
    await lp.testMint(wallet.address, 1, 10)
    await lp.testMint(wallet.address, 1, 14)
    await lp.testMint(wallet.address, 1, 13)
    await lp.testMint(wallet.address, 1, 11)
    await lp.testMint(wallet.address, 1, 12)
    await token.mint(1, TEST_AMOUNT)
    await token.mint(2, TEST_AMOUNT)
    await token.mint(3, TEST_AMOUNT)
    await token.mint(4, TEST_AMOUNT)
    await token.mint(5, TEST_AMOUNT)
    await lp.testMint(wallet.address, 2, 9)
    await lp.testMint(wallet.address, 2, 14)
    await lp.testMint(wallet.address, 2, 13)
    await lp.testMint(wallet.address, 2, 11)
    await lp.testMint(wallet.address, 2, 12)
    await token.mint(6, TEST_AMOUNT)
    await token.mint(7, TEST_AMOUNT)
    await token.mint(8, TEST_AMOUNT)
    await token.mint(9, TEST_AMOUNT)
    await token.mint(10, TEST_AMOUNT)
    await power.stakeComposite(wallet.address, token.address, [1, 2, 3, 4, 5])
    await power.stakeComposite(wallet.address, token.address, [6, 7, 8, 9, 10])
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(60+1000))
    expect(await power.getCompositePowerdByIndex(wallet.address, 1)).to.eq(TEST_AMOUNT.mul(5).mul(59+275))
    await power.unstakeComposite(wallet.address, 0)
    expect(await power.getCompositePowerdByIndex(wallet.address, 0)).to.eq(TEST_AMOUNT.mul(5).mul(59+275))
  })

})
