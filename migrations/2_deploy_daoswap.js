const DSPToken = artifacts.require("YOUToken");
const TokenZB = artifacts.require("ZBERC20");
const TokenQC = artifacts.require("QCERC20");
const TokenQFIL = artifacts.require("UNIERC20");
const TokenUSDT = artifacts.require("USDTERC20");
const Weth = "0xb54A5d7C3d175D08F28f98F01fC25E9c2991fC3A";
const YouswapPair = artifacts.require("YouswapPair");
// const YouswapEthPair = artifacts.require("YouswapPair");
const YouswapZBQCPair = artifacts.require("YouswapPair");
const YouswapETHQCPair = artifacts.require("YouswapPair");
const YouswapQFILQCPair = artifacts.require("YouswapPair");
const YouswapUSDTQCPair = artifacts.require("YouswapPair");
const YouswapDao = artifacts.require("YouswapDao");
const YouswapRouter = artifacts.require("YouswapRouter");
const InvitationRelationShip = artifacts.require("InvitationRelationShip");

module.exports = async (deployer, network, accounts) => {
    if (network == 'test') {
        await deployer.deploy(DSPToken)
        let dsp = await DSPToken.deployed()
        await deployer.deploy(TokenZB)
        let zb = await TokenZB.deployed()
        await deployer.deploy(TokenQC)
        let qc = await TokenQC.deployed()
        await deployer.deploy(TokenQFIL)
        let qfil = await TokenQFIL.deployed()
        await deployer.deploy(TokenUSDT)
        let usdt = await TokenUSDT.deployed()
        await deployer.deploy(InvitationRelationShip)
        let delegate = await InvitationRelationShip.deployed()
        await deployer.deploy(YouswapDao, delegate.address, dsp.address, 5, 1, 11184100)
        let dao = await YouswapDao.deployed()
        await delegate.set_dao_contract_address(dao.address)
        await dsp.changeOwner(YouswapDao.address)
        await deployer.deploy(YouswapPair)
        let zbqc = await YouswapPair.deployed()
        await zbqc.initialize(zb.address, qc.address, dao.address)
        await dao.createPair(zbqc.address)
        await deployer.deploy(YouswapPair)
        let ethqc = await YouswapPair.deployed()
        await ethqc.initialize(Weth, qc.address, dao.address)
        await dao.createPair(ethqc.address)
        await deployer.deploy(YouswapPair)
        let qfilqc = await YouswapPair.deployed()
        await qfilqc.initialize(qfil.address, usdt.address, dao.address)
        await dao.createPair(qfilqc.address)
        await deployer.deploy(YouswapPair)
        let usdtqc = await YouswapPair.deployed()
        await usdtqc.initialize(usdt.address, qc.address, dao.address)
        await dao.createPair(usdtqc.address)
        await dao.changeWeight(zbqc.address, 50)
        await dao.changeWeight(ethqc.address, 30)
        await dao.changeWeight(qfilqc.address, 15)
        await dao.changeWeight(usdtqc.address, 5)
        await deployer.deploy(YouswapRouter, dao.address, Weth)
    } else if (network == 'eth') {
        let ZBToken = '0x5a9c8c6406d341a16aa3010108026f45fc372168'
        let QCToken = '0xe74b35425fe7e33ea190b149805baf31139a8290'
        let WETHToken = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
        let QFILToken = '0x571a74c42f99d46a55cc85cabac5863662775a16'
        let USDTToken = '0xdac17f958d2ee523a2206206994597c13d831ec7'
        await deployer.deploy(DSPToken)
        let dsp = await DSPToken.deployed()
        await deployer.deploy(InvitationRelationShip)
        let delegate = await InvitationRelationShip.deployed()
        await deployer.deploy(YouswapDao, delegate.address, dsp.address, 5, 1, 11184100)
        let dao = await YouswapDao.deployed()
        await delegate.set_dao_contract_address(dao.address)
        await dsp.changeOwner(dao.address)
        await deployer.deploy(YouswapZBQCPair)
        let pairZBQC = await YouswapZBQCPair.deployed()
        await pairZBQC.initialize(ZBToken, QCToken, dao.address)
        await dao.createPair(pairZBQC.address)
        await deployer.deploy(YouswapETHQCPair)
        let pairETHQC = await YouswapETHQCPair.deployed()
        await pairETHQC.initialize(WETHToken, QCToken, dao.address)
        await dao.createPair(pairETHQC.address)
        await deployer.deploy(YouswapQFILQCPair)
        let pairQFILQC = await YouswapQFILQCPair.deployed()
        await pairQFILQC.initialize(QFILToken, QCToken, dao.address)
        await dao.createPair(pairQFILQC.address)
        await deployer.deploy(YouswapUSDTQCPair)
        let pairUSDTQC = await YouswapUSDTQCPair.deployed()
        await pairUSDTQC.initialize(QFILToken, USDTToken, dao.address)
        await dao.createPair(pairUSDTQC.address)
        await dao.changeWeight(pairZBQC.address, 50)
        await dao.changeWeight(pairETHQC.address, 30)
        await dao.changeWeight(pairQFILQC.address, 15)
        await dao.changeWeight(pairUSDTQC.address, 5)
        await deployer.deploy(YouswapRouter, dao.address, Weth)
    }
}
