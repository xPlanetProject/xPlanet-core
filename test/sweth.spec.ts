import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { expandTo18Decimals, getApprovalDigest } from './shared/utilities'
import SWETH from '../build/SWETH.json'

chai.use(solidity)


describe('SWETH', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  let token: Contract
  beforeEach(async () => {
    token = await deployContract(wallet, SWETH, [])
  })

  it('init', async () => {
    const name = await token.name()
    expect(name).to.eq('Wrapped Ether')
    expect(await token.symbol()).to.eq('WETH')
    expect(await token.decimals()).to.eq(18)
    expect(await token.totalSupply()).to.eq(0)
  })

  it('deposit', async () => {
    const amount = expandTo18Decimals(1)
    await expect(token.deposit({value: amount})).to.emit(token, 'Deposit').withArgs(wallet.address, amount);
    expect(await token.balanceOf(wallet.address)).to.eq(amount)
  })

  it('withdraw', async () => {
    const amount = expandTo18Decimals(2)
    await expect(token.deposit({value: amount})).to.emit(token, 'Deposit').withArgs(wallet.address, amount);
    expect(await token.balanceOf(wallet.address)).to.eq(amount)

    await expect(token.withdraw(amount)).to.emit(token, 'Withdrawal').withArgs(wallet.address, amount);
    expect(await token.balanceOf(wallet.address)).to.eq(0)
  })
})
