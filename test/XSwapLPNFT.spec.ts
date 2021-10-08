import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { MaxUint256 } from 'ethers/constants'
import { bigNumberify, hexlify, keccak256, defaultAbiCoder, toUtf8Bytes } from 'ethers/utils'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { ecsign } from 'ethereumjs-util'

import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'

import XSwapLPNFT from '../build/XSwapLPNFT.json'

chai.use(solidity)

const TOTAL_SUPPLY = expandTo18Decimals(1000000000)
const TEST_AMOUNT = expandTo18Decimals(10)

describe('XSwapLPNFT', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let token: Contract
  beforeEach(async () => {
    token = await deployContract(wallet, XSwapLPNFT)
  })

  it('init', async () => {
    const name = await token.name()
    expect(name).to.eq('xPlanet xPoker')
    expect(await token.symbol()).to.eq('xPoker')
    expect(await token.totalSupply()).to.eq(0)
    expect(await token.owner()).to.eq(wallet.address)
  })

  it('mintAndOpenLootBox', async () => {
    await expect(token.connect(other).setMinter(other.address)).to.be.revertedWith('Ownable: caller is not the owner')
    await token.setMinter(other.address)
    await expect(token.mintUniqueTokenTo(wallet.address)).to.be.reverted
    await token.connect(other).mintUniqueTokenTo(wallet.address)
    expect(await token.ownerOf(1)).to.eq(wallet.address)
    for (let i=0; i<10; i++) {
        await token.connect(other).mintUniqueTokenTo(wallet.address)
    }
    await token.openLootBox(1)
    let property = await token.getPokerProperty(1)
    console.log(property)
  })

})
