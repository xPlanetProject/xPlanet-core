pragma solidity=0.5.16;


import './interfaces/IERCMint20.sol';


contract FundPool {
    
    event ReleaseMintToInvestor(address, uint);
    event ReleaseMintToTeam(address, uint);
    
    // precision
    int256 constant TOKEN_PRECISION = int256(1000000000000000000);
    
    // max release supply to investor
    int256 constant BALANCE_RELEASED_TO_INVESTOR_MAX = int256(100000000) * TOKEN_PRECISION;
    
    address contract_owner;
    address contract_admin;
    address token_contract_address;
    address token_team_address;
    address token_investor_address;
    bool contract_switch;
    int256 balance_release_to_investor_per_block;
    uint256 last_settle_block_height;
    int256 total_balance_released_to_investor;
    
    
    constructor(address _token_contract_address,
        address _token_investor_address,
        address _token_team_address,
        int256 _balance_release_to_investor_per_block) public {
        contract_owner = msg.sender;
        contract_admin = msg.sender;
        
        // token contract address
        token_contract_address = _token_contract_address;
        
        // investor address
        token_investor_address = _token_investor_address;
        
        // team address
        token_team_address = _token_team_address;
        
        // turn on / turn off
        contract_switch = false;
        
        balance_release_to_investor_per_block = _balance_release_to_investor_per_block;
        
        last_settle_block_height = uint256(0);
        
        // supply has been released
        total_balance_released_to_investor = int256(0);
    }
    
    
    modifier onlyOwner() {
        require(msg.sender == contract_owner, "for contract owner only");
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == contract_admin, "for contract administrator only");
        _;
    }
    
    modifier notReleaseDone() {
        require(total_balance_released_to_investor < BALANCE_RELEASED_TO_INVESTOR_MAX, "total balance released done");
        _;
    }
    
    modifier needSwitchOn() {
        require(contract_switch == true, "fund release switch is off");
        _;
    }
    
    modifier needSwitchOff() {
        require(contract_switch == false, "fund release switch is on");
        _;
    }
    
    function _releaseBalance() internal 
    onlyAdmin() 
    notReleaseDone()
    needSwitchOn() {
        uint256 latest_block_num = block.number;
        assert(latest_block_num > last_settle_block_height);
        
        int256 need_to_release_to_investor = balance_release_to_investor_per_block * int256(latest_block_num - last_settle_block_height);
        assert(need_to_release_to_investor > 0);
        int256 total = total_balance_released_to_investor + need_to_release_to_investor;
        assert(total > 0);
        
        if (total >= BALANCE_RELEASED_TO_INVESTOR_MAX) {
            need_to_release_to_investor = BALANCE_RELEASED_TO_INVESTOR_MAX - total_balance_released_to_investor;
            
            // reach the max supply
            total_balance_released_to_investor = BALANCE_RELEASED_TO_INVESTOR_MAX;
            // turn switch to off
            contract_switch = false;
            last_settle_block_height = uint256(0);
        } else {
            total_balance_released_to_investor = total;
            // set latest settle block number
            last_settle_block_height = block.number;
        }
        
        int256 need_to_release_to_team = int256(2) * need_to_release_to_investor;
        assert(need_to_release_to_team > 0);
        
        // mint for investor
        IERCMint20(token_contract_address).minerMint(token_investor_address, uint(need_to_release_to_investor));
        emit ReleaseMintToInvestor(token_investor_address, uint(need_to_release_to_investor));
        
        // mint for team
        IERCMint20(token_contract_address).minerMint(token_team_address, uint(need_to_release_to_team));
        emit ReleaseMintToTeam(token_team_address, uint(need_to_release_to_team));
        
    }
    
    function setAdmin(address admin_new) external 
    onlyAdmin() {
        contract_admin = admin_new;
    }
    
    function turnOn() external 
    onlyAdmin()
    notReleaseDone()
    needSwitchOff() {
        contract_switch = true;
        last_settle_block_height = block.number;
    }
    
    function turnOff() external 
    onlyAdmin()
    notReleaseDone()
    needSwitchOn() {
        
        _releaseBalance();
        
        contract_switch = false;
        last_settle_block_height = uint256(0);
    }
    
    function modifyProductForInvestorPerBlock(int256 produce_per_block) external 
    onlyAdmin() 
    notReleaseDone() {
        assert(produce_per_block > 0);
        assert(produce_per_block < BALANCE_RELEASED_TO_INVESTOR_MAX);
        
        if (contract_switch) {
            _releaseBalance();
        }
        
        balance_release_to_investor_per_block = produce_per_block;
    }
    
    function releaseMint() external 
    onlyAdmin() 
    notReleaseDone() 
    needSwitchOn() {
        
        _releaseBalance();
    }
    
    function getOwner() external view returns (address) {
        return contract_owner;
    }
    
    function getAdmin() external view returns (address) {
        return contract_admin;
    }
    
    function getTokenContractAddr() external view returns (address) {
        return token_contract_address;
    }
    
    function getTokenTeamAddr() external view returns (address) {
        return token_team_address;
    }
    
    function getTokenInvestorAddr() external view returns (address) {
        return token_investor_address;
    }
    
    function getSwitchStatus() external view returns (bool) {
        return contract_switch;
    }
    
    function getTotalSupplyForInvestor() public pure returns (int256) {
        return BALANCE_RELEASED_TO_INVESTOR_MAX;
    }
    
    function getTotalSupplyForTeam() public pure returns (int256) {
        return BALANCE_RELEASED_TO_INVESTOR_MAX * int256(2);
    }
    
    function getReleasedBalanceForInvestor() external view returns (int256) {
        return total_balance_released_to_investor;
    }
    
    function getReleasedBalanceForTeam() external view returns (int256) {
        return total_balance_released_to_investor * int256(2);
    }
    
    function getProductForInvestorPerBlock() external view returns (int256) {
        return balance_release_to_investor_per_block;
    }
    
    function getProductForTeamPerBlock() external view returns (int256) {
        return balance_release_to_investor_per_block * int256(2);
    }
    
    function getSupplyLeftForInvestor() external view returns (int256) {
        return BALANCE_RELEASED_TO_INVESTOR_MAX - total_balance_released_to_investor;
    }
    
    function getSupplyLeftForTeam() external view returns (int256) {
        return (BALANCE_RELEASED_TO_INVESTOR_MAX - total_balance_released_to_investor) * int256(2);
    }
    
    function estimateCurrentProductForInvestor() external view returns (int256) {
        if (contract_switch == false) {
            return 0;
        }
        
        uint256 latest_block_num = block.number;
        if (latest_block_num <= last_settle_block_height) {
            return 0;
        }
        
        int256 need_to_release_to_investor = balance_release_to_investor_per_block * int256(latest_block_num - last_settle_block_height);
        assert(need_to_release_to_investor > 0);
        
        int256 total = total_balance_released_to_investor + need_to_release_to_investor;
        assert(total > 0);
        
        if (total >= BALANCE_RELEASED_TO_INVESTOR_MAX) {
            need_to_release_to_investor = BALANCE_RELEASED_TO_INVESTOR_MAX - total_balance_released_to_investor;
        } 
        
        return need_to_release_to_investor;
    }
    
    function estimateCurrentProductForTeam() external view returns (int256) {
        if (contract_switch == false) {
            return 0;
        }
        
        uint256 latest_block_num = block.number;
        if (latest_block_num <= last_settle_block_height) {
            return 0;
        }
        
        int256 need_to_release_to_investor = balance_release_to_investor_per_block * int256(latest_block_num - last_settle_block_height);
        assert(need_to_release_to_investor > 0);
        
        int256 total = total_balance_released_to_investor + need_to_release_to_investor;
        assert(total > 0);
        
        if (total >= BALANCE_RELEASED_TO_INVESTOR_MAX) {
            need_to_release_to_investor = BALANCE_RELEASED_TO_INVESTOR_MAX - total_balance_released_to_investor;
        } 
        
        int256 need_to_release_to_team = need_to_release_to_investor * int256(2);
        return need_to_release_to_team;
    }
}
