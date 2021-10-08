import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider } from 'ethereum-waffle'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './shared/utilities'
import ERC20 from '../build/ERC20.json'
import XKeyDao from '../build/XkeyDao.json'
import XKeyToken from '../build/XKeyToken.json'
import XKeySwapLpNFT from '../build/XSwapLPNFT.json'
import XKeyFactory from '../build/XKeyFactory.json'
import {bigNumberify} from "ethers/utils";
chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

describe('XKeyFactory', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()
  let XKeySwaplpNft : Contract
  let xkeyFactory : Contract
  let LPtokenA: Contract
  let LPtokenB:Contract
  let xkeytoken:Contract
  let Dao: Contract
  beforeEach(async () => {
    XKeySwaplpNft = await deployContract(wallet,XKeySwapLpNFT)
    await XKeySwaplpNft.setMinter(wallet.address)
    xkeyFactory = await  deployContract(wallet,XKeyFactory,[XKeySwaplpNft.address])
    await  xkeyFactory.setRouter(wallet.address)
    LPtokenA = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    LPtokenB = await deployContract(wallet, ERC20,[expandTo18Decimals(600000)])
    await xkeyFactory.createPair(LPtokenA.address,LPtokenB.address)
  })

  it('init', async () => {
    expect(await xkeyFactory.allPairsLength()).to.eq(1)
    expect(await xkeyFactory.swapLPNFT()).to.eq(XKeySwaplpNft.address)
    expect(await xkeyFactory.router_addr()).to.eq(wallet.address)
    expect(await xkeyFactory.getOwner()).to.eq(wallet.address)
    const pairaddr = await xkeyFactory.allPairs(0)
    expect(await xkeyFactory.getPair(LPtokenA.address,LPtokenB.address)).to.eq(pairaddr)
    expect(await xkeyFactory.getPair(LPtokenB.address,LPtokenA.address)).to.eq(pairaddr)
  })

})
