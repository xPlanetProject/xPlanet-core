import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes } from 'ethers/utils'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'

import xPokerSpecial from '../build/xPokerSpecial.json'

chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(1000000000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('XPlanetPoker', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let poker: Contract
  beforeEach(async () => {
    poker = await deployContract(wallet, xPokerSpecial, [wallet.address])
  })

  it('init', async () => {
    const name = await poker.name()
    expect(name).to.eq('XPOKERSPECIAL')
    expect(await poker.symbol()).to.eq('XPS')
    expect(await poker.maxCardNum()).to.eq(2000)
    expect(await poker.totalSupply()).to.eq(0)
    expect(await poker.baseTokenURI()).to.eq("http://specialpoker.xplanet.io/")
  })

  it('setTotalCards', async () => {
    await expect(poker.setTotalCards(1000)).to.be.revertedWith('Not premitted to set smaller count.')
    await poker.setTotalCards(10000)
    expect(await poker.maxCardNum()).to.eq(10000)
  })

  it('setMinter', async () => {
    expect(await poker.minter()).to.eq(wallet.address)
    await poker.setMinter(other.address)
    expect(await poker.minter()).to.eq(other.address)
  })

  it('mint', async () => {
    await poker.mintGold(wallet.address)
    await poker.mintSilver(wallet.address)
    await poker.mintCopper(wallet.address)
    expect(await poker.tokenURI(1)).to.eq("http://specialpoker.xplanet.io/1")
    expect(await poker.ownerOf(1)).to.eq(wallet.address)
    expect(await poker.ownerOf(100001)).to.eq(wallet.address)
    expect(await poker.ownerOf(200001)).to.eq(wallet.address)
  })
})
