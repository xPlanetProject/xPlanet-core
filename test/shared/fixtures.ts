import { Contract, Wallet } from 'ethers'
import { Web3Provider } from 'ethers/providers'
import { deployContract } from 'ethereum-waffle'
import { expandTo18Decimals } from './utilities'

import ERC20 from '../../build/ERC20.json'
//import ErcMint20 from '../../build/ErcMint20.json'
import YOUToken from '../../build/YOUToken.json'
import YouswapDao from '../../build/YouswapDao.json'
import YouswapPair from '../../build/YouswapPair.json'
import SWETH from '../../build/SWETH.json'
import InvitationRelationShip from '../../build/InvitationRelationShip.json'

interface FactoryFixture {
  erc: Contract
  factory: Contract
}
interface FactoryFixtureAll {
  erc: Contract
  factory: Contract
  delegate : Contract
}

const overrides = {
  gasLimit: 9999999
}
let x : Wallet[]
export async function InventoryFixture(_: Web3Provider, [wallet]: Wallet[]): Promise<FactoryFixture> {
  const erc = await deployContract(wallet, DSPToken);
  const delegate = await deployContract(wallet, InvitationRelationShip)
  const factory = await deployContract(wallet, YouswapDao, [
    delegate.address, erc.address,  5, 1], overrides)
  await erc.changeOwner(factory.address)

  return { erc, factory }
}
export async function factoryFixture(_: Web3Provider, [wallet]: Wallet[]): Promise<FactoryFixture> {
  const erc = await deployContract(wallet, DSPToken);
  const delegate = await deployContract(wallet, InvitationRelationShip)
  const factory = await deployContract(wallet, YouswapDao, [
    delegate.address, erc.address,  5, 1], overrides)
  await delegate.set_dao_contract_address(factory.address)
  await erc.changeOwner(factory.address)
  await delegate.add_invitation_relation("0x00000000000000000000000000000000000000FF")
  return { erc, factory }
}
export async function factoryFixtureAll(_: Web3Provider, [wallet]: Wallet[]): Promise<FactoryFixtureAll> {
  const erc = await deployContract(wallet, DSPToken);
  const delegate = await deployContract(wallet, InvitationRelationShip)
  const factory = await deployContract(wallet, YouswapDao, [
    delegate.address, erc.address,  5, 1], overrides)
  await delegate.set_dao_contract_address(factory.address)
  await erc.changeOwner(factory.address)
  await delegate.add_invitation_relation("0x00000000000000000000000000000000000000FF")
  return { erc, factory, delegate }
}

interface PairFixture extends FactoryFixture {
  token0: Contract
  token1: Contract
  pair: Contract
}

export async function pairFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<PairFixture> {
  const { erc, factory } = await factoryFixture(provider, [wallet])
  const tokenA = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const tokenB = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)], overrides)
  const pair = await deployContract(wallet, YouswapPair)
  await pair.initialize(tokenA.address, tokenB.address, factory.address)
  await factory.createPair(pair.address, overrides)
  const token0 = tokenA
  const token1 = tokenB

  return { erc, factory, token0, token1, pair }
}

interface DelegateFixture extends FactoryFixture {
}

export async function delegateFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<DelegateFixture> {
    const { erc, factory } = await factoryFixture(provider, [wallet])
    return { erc, factory }
}

interface RouterFixture extends PairFixture {
    weth: Contract
    pairEth: Contract
}

export async function routerFixture(provider: Web3Provider, [wallet]: Wallet[]): Promise<RouterFixture> {
    const { erc, factory, token0, token1, pair } = await pairFixture(provider, [wallet])
    const pairEth = await deployContract(wallet, YouswapPair)
    const weth = await deployContract(wallet, SWETH)
    await pairEth.initialize(token1.address, weth.address, factory.address)
    await factory.createPair(pairEth.address, overrides)
    return { erc, factory, token0, token1, pair, weth, pairEth }
}
