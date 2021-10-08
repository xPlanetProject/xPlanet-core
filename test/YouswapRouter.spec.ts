import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { bigNumberify } from 'ethers/utils'
import { MaxUint256 } from 'ethers/constants'
import { solidity, MockProvider, deployContract, createFixtureLoader } from 'ethereum-waffle'

import { routerFixture } from './shared/fixtures'
import { mineBlock, expandTo18Decimals } from './shared/utilities'
import YouswapRouter from '../build/YouswapRouter.json'
// import SWETH from '../build/SWETH.json'

chai.use(solidity)

const overrides = {
    gasLimit: 9999999
}

describe('YouswapRouter', () => {
    const provider = new MockProvider({
        hardfork: 'istanbul',
        mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
        gasLimit: 9999999
    })
    const [wallet, other] = provider.getWallets()
    const loadFixture = createFixtureLoader(provider, [wallet, other])
    const MINIMUM_LIQUIDITY = bigNumberify(10).pow(3)
    let factory: Contract
    let router: Contract
    let token0: Contract
    let token1: Contract
    let pair: Contract
    let pairEth: Contract
    let weth: Contract
    beforeEach(async () => {
        const fixture = await loadFixture(routerFixture)
        factory = fixture.factory
        token0 = fixture.token0
        token1 = fixture.token1
        pair = fixture.pair
        pairEth = fixture.pairEth
        weth = fixture.weth
        router = await deployContract(wallet, YouswapRouter, [factory.address, weth.address])
        expect(await router.WETH()).to.eq(weth.address)
    })

    it('addLiquidity:init', async () => {
        expect(await factory.getPair(token0.address, token1.address)).to.eq(pair.address)
        expect(await token0.balanceOf(wallet.address)).to.eq(expandTo18Decimals(10000))
        expect(await token1.balanceOf(wallet.address)).to.eq(expandTo18Decimals(10000))
        const token0Amount = expandTo18Decimals(5)
        const token1Amount = expandTo18Decimals(5)
        await token0.approve(router.address, token0Amount)
        await token1.approve(router.address, token1Amount)
        await expect(router.addLiquidity(token0.address, token1.address, token0Amount, token1Amount, 0, 0, MaxUint256))
            .to.emit(pair, 'Mint')
        // const receipt = await tx.wait()
        // expect(receipt.gasUsed).to.eq(347696)
        expect(await pair.balanceOf(wallet.address)).to.eq(expandTo18Decimals(5).sub(MINIMUM_LIQUIDITY))
        expect(await token0.balanceOf(pair.address)).to.eq(expandTo18Decimals(5))
        expect(await token0.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9995))
        expect(await token1.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9995))
    })


    it('addLiquidity:more', async () => {
        const token0Amount = expandTo18Decimals(5)
        const token1Amount = expandTo18Decimals(5)
        await token0.approve(router.address, token0Amount)
        await token1.approve(router.address, token1Amount)
        await router.addLiquidity(token0.address, token1.address, token0Amount, token1Amount, 0, 0, MaxUint256)
        expect(await token0.allowance(wallet.address, router.address)).to.eq(0)
        expect(await token1.allowance(wallet.address, router.address)).to.eq(0)
        expect(await token0.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9995))
        expect(await token1.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9995))

        await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)
        await pair.sync(overrides)

        const token0Amount2 = expandTo18Decimals(2)
        const token1Amount2 = expandTo18Decimals(5)
        await token0.approve(router.address, token0Amount2)
        await token1.approve(router.address, token1Amount2)
        expect(await token0.allowance(wallet.address, router.address)).to.eq(token0Amount2)
        expect(await token1.allowance(wallet.address, router.address)).to.eq(token1Amount2)
        const tx = await (router.addLiquidity(token0.address, token1.address, token0Amount2, token1Amount2, 0, 0, MaxUint256))
        const receipt = await tx.wait()
        expect(receipt.gasUsed).to.eq(128237)
        expect(await pair.balanceOf(wallet.address)).to.eq(expandTo18Decimals(7).sub(MINIMUM_LIQUIDITY))
        expect(await token0.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9993))
        expect(await token1.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9993))
    })

    it('addLiquidityETH:init', async () => {
        expect(await factory.getPair(weth.address, token1.address)).to.eq(pairEth.address)
        expect(await weth.balanceOf(wallet.address)).to.eq(expandTo18Decimals(0))
        // await weth.deposit({ value: expandTo18Decimals(10000) })
        // expect(await weth.balanceOf(wallet.address)).to.eq(expandTo18Decimals(10000))
        // expect(await weth.totalSupply()).to.eq(expandTo18Decimals(10000))
        expect(await token1.balanceOf(wallet.address)).to.eq(expandTo18Decimals(10000))
        const token0Amount = expandTo18Decimals(5)
        const token1Amount = expandTo18Decimals(5)
        await token1.approve(router.address, token1Amount)
        const tx = await router.addLiquidityETH(token1.address, token1Amount, 0, 0, MaxUint256, {value: token0Amount})
        const receipt = await tx.wait()
        expect(receipt.gasUsed).to.eq(292588)
        expect(await pairEth.totalSupply()).to.eq(expandTo18Decimals(5))
        expect(await pairEth.balanceOf(wallet.address)).to.eq(expandTo18Decimals(5).sub(MINIMUM_LIQUIDITY))
        expect(await weth.balanceOf(pairEth.address)).to.eq(expandTo18Decimals(5))
        expect(await weth.totalSupply()).to.eq(expandTo18Decimals(5))
        expect(await token1.balanceOf(wallet.address)).to.eq(expandTo18Decimals(9995))
    })

    it('removeLiquidity:more', async () => {
        const token0Amount = expandTo18Decimals(2)
        const token1Amount = expandTo18Decimals(8)
        await token0.approve(router.address, token0Amount)
        await token1.approve(router.address, token1Amount)
        await router.addLiquidity(token0.address, token1.address, token0Amount, token1Amount, 0, 0, MaxUint256)
        expect(await pair.balanceOf(wallet.address)).to.eq(expandTo18Decimals(4).sub(MINIMUM_LIQUIDITY))

        await pair.approve(router.address, expandTo18Decimals(4))
        await (router.removeLiquidity(token0.address, token1.address, expandTo18Decimals(1), 0, 0, other.address, MaxUint256))
        expect(await pair.balanceOf(wallet.address)).to.eq(expandTo18Decimals(3).sub(MINIMUM_LIQUIDITY))
        expect(await token0.balanceOf(other.address)).to.eq(expandTo18Decimals(1).div(2))
        expect(await token1.balanceOf(other.address)).to.eq(expandTo18Decimals(2))
        await router.removeLiquidity(token0.address, token1.address, expandTo18Decimals(3).sub(MINIMUM_LIQUIDITY), 0, 0, other.address, MaxUint256)
        expect(await token0.balanceOf(other.address)).to.eq(expandTo18Decimals(2).sub(MINIMUM_LIQUIDITY.div(2)))
        expect(await token1.balanceOf(other.address)).to.eq(expandTo18Decimals(8).sub(MINIMUM_LIQUIDITY.mul(2)))
    })

  it('removeLiquidityETH:more', async () => {
    const token0Amount = expandTo18Decimals(2)
    const token1Amount = expandTo18Decimals(8)
    await token1.approve(router.address, token1Amount)
    const tx = await router.addLiquidityETH(token1.address, token1Amount, 0, 0, MaxUint256, {value: token0Amount})
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(292588)
    expect(await pairEth.balanceOf(wallet.address)).to.eq(expandTo18Decimals(4).sub(MINIMUM_LIQUIDITY))

    await pairEth.approve(router.address, expandTo18Decimals(4))
    await (router.removeLiquidityETH(token1.address, expandTo18Decimals(1), 0, 0, other.address, MaxUint256))
    expect(await pairEth.balanceOf(wallet.address)).to.eq(expandTo18Decimals(3).sub(MINIMUM_LIQUIDITY))
    expect(await token1.balanceOf(other.address)).to.eq(expandTo18Decimals(2))
    await router.removeLiquidityETH(token1.address, expandTo18Decimals(3).sub(MINIMUM_LIQUIDITY), 0, 0, other.address, MaxUint256)
    expect(await pairEth.balanceOf(wallet.address)).to.eq(0)
    expect(await token1.balanceOf(other.address)).to.eq(expandTo18Decimals(8).sub(MINIMUM_LIQUIDITY.mul(2)))
  })

    it('swapExactTokensForTokens:normal', async () => {
        const token0Amount = expandTo18Decimals(1000)
        const token1Amount = expandTo18Decimals(1000)
        await token0.approve(router.address, token0Amount)
        await token1.approve(router.address, token1Amount)
        await router.addLiquidity(token0.address, token1.address, token0Amount, token1Amount, 0, 0, MaxUint256)
        await token0.transfer(other.address, expandTo18Decimals(10))
        expect(await token0.balanceOf(other.address)).to.eq(expandTo18Decimals(10))
        // expect(await token1.balanceOf(other.address)).to.eq(expandTo18Decimals(1))
        await token0.connect(other).approve(router.address, MaxUint256)

        await expect(router.connect(other).swapExactTokensForTokens(expandTo18Decimals(5), 0, [token0.address, token1.address], other.address, MaxUint256))
            .to.emit(token0, 'Transfer')
            .withArgs(other.address, pair.address, expandTo18Decimals(5))
            .to.emit(token1, 'Transfer')
            .withArgs(pair.address, other.address, bigNumberify('4960273038901078125'))
            .to.emit(pair, 'Sync')
            .withArgs(bigNumberify('1005000000000000000000'), bigNumberify('995039726961098921875'))
            .to.emit(pair, 'Swap')
             .withArgs(router.address, expandTo18Decimals(5), 0, 0, bigNumberify('4960273038901078125'), other.address)
        expect(await token0.balanceOf(other.address)).to.eq(expandTo18Decimals(5))
        expect(await token0.balanceOf(pair.address)).to.eq(expandTo18Decimals(1005))
        expect(await token1.balanceOf(pair.address)).to.eq(bigNumberify('995039726961098921875'))
        expect(await token1.balanceOf(router.address)).to.eq(0)
        expect(await token1.balanceOf(other.address)).to.eq(bigNumberify('4960273038901078125'))

        await token1.connect(other).approve(router.address, MaxUint256)
        await token1.transfer(other.address, expandTo18Decimals(1))
        await expect(router.connect(other).swapExactTokensForTokens(expandTo18Decimals(5), 0, [token1.address, token0.address], other.address, MaxUint256))
            .to.emit(token0, 'Transfer')
            // .withArgs(other.address, pair.address, expandTo18Decimals(5))
            .to.emit(token1, 'Transfer')
            // .withArgs(pair.address, wallet.address, bigNumberify('4911234363778747333'))
            .to.emit(pair, 'Sync')
            // .withArgs(bigNumberify('1010000000000000000000'), bigNumberify('990128492597320174542'))
            .to.emit(pair, 'Swap')
            // .withArgs(router.address, expandTo18Decimals(5), 0, 0, bigNumberify('4911234363778747333'), wallet.address)
        expect(await token0.balanceOf(other.address)).to.eq(bigNumberify('10009801122842522137'))
        expect(await token0.balanceOf(pair.address)).to.eq(bigNumberify('999990198877157477863'))
        expect(await token1.balanceOf(pair.address)).to.eq(bigNumberify('1000039726961098921875'))
        expect(await token1.balanceOf(router.address)).to.eq(0)
        expect(await token1.balanceOf(other.address)).to.eq(bigNumberify('960273038901078125'))
        })

    it('swapExactETHForTokens:swapExactTokensForETH', async () => {
        const token1Amount = expandTo18Decimals(1000)
        await token1.approve(router.address, token1Amount)
        await router.addLiquidityETH(token1.address, token1Amount, 0, 0, MaxUint256, {value: token1Amount})

        await expect(router.connect(other).swapExactETHForTokens(
                0, [weth.address, token1.address], other.address, MaxUint256,
                {value: expandTo18Decimals(5)}))
            .to.emit(weth, 'Transfer')
            // .withArgs(other.address, pair.address, expandTo18Decimals(5))
            .to.emit(token1, 'Transfer')
            // .withArgs(pair.address, other.address, bigNumberify('4960273038901078125'))
            // .to.emit(pair, 'Sync')
            // .withArgs(bigNumberify('1005000000000000000000'), bigNumberify('995039726961098921875'))
            // .to.emit(pair, 'Swap')
            // .withArgs(router.address, expandTo18Decimals(5), 0, 0, bigNumberify('4960273038901078125'), wallet.address)
        expect(await weth.balanceOf(pairEth.address)).eq(bigNumberify('1005000000000000000000'))
        expect(await weth.balanceOf(other.address)).eq(0)
        expect(await token1.balanceOf(other.address)).eq(bigNumberify('4960273038901078125'))
        expect(await other.getBalance()).eq(bigNumberify('9999999999999994999760802000000000'))

        await token1.connect(other).approve(router.address, MaxUint256)
        await expect(router.connect(other).swapExactTokensForETH(
            expandTo18Decimals(4), 0, [token1.address, weth.address], other.address, MaxUint256))
        .to.emit(token1, 'Transfer')
        // .withArgs(other.address, pair.address, expandTo18Decimals(4))
        .to.emit(weth, 'Transfer')
        // .withArgs(pair.address, other.address, bigNumberify('4011840604456081252'))
        // .to.emit(pair, 'Sync')
        // .withArgs(bigNumberify('1005000000000000000000'), bigNumberify('995039726961098921875'))
        // .to.emit(pair, 'Swap')
        // .withArgs(router.address, expandTo18Decimals(5), 0, 0, bigNumberify('4960273038901078125'), wallet.address)
        expect(await weth.balanceOf(pairEth.address)).eq(bigNumberify('1000988159395543918748'))
        expect(await weth.balanceOf(other.address)).eq(0)
        expect(await token1.balanceOf(other.address)).eq(bigNumberify('960273038901078125'))
        expect(await other.getBalance()).eq(bigNumberify('9999999999999999011281590456081252'))
  })

})
