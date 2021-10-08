pragma solidity=0.5.16;
import './libraries/SafeMath.sol';
import './libraries/SignedSafeMath.sol';
import './interfaces/IERCMint20.sol';
import './interfaces/IERC721.sol';

contract XKeyNFT721Staking {
    using SafeMath  for uint;
    using SignedSafeMath for int256;
    // support staking NFT contract address
    mapping(address=>bool) public supportNFTContracts;

    // user=>nft=>tokenid=>bool
    mapping(address=>mapping(address=>mapping(uint=>bool))) userNFTTokenid;

    mapping(address=>uint) public swaptoken_last_reward_blocknum;
    mapping(address=>uint) public swaptoken_weight;
    mapping(address=>uint) public swaptoken_pershare_reward;
    mapping(address=>mapping(address=>uint)) swaptoken_user_share;
    mapping(address=>mapping(address=>int)) swaptoken_user_rewardDebt;

    uint public all_weight;
    uint public perblockreward;
    address public erc_mintaddr;
    uint256 private constant ACC_XKey_PRECISION = 10 ** 12;
    uint256 public swaptoken_had_mint;
    uint256 public swaptoken_totalMint;
    address owner;
    address[] public swaptoken_addrs;



    event LiquidSwapTokenCreated(address,uint,uint);
    constructor(
        address _erc_mintaddr,
        uint _perblockreward,
        uint _swaptoken_totalMint) public {
        owner = msg.sender;
        erc_mintaddr =  _erc_mintaddr;
        perblockreward = _perblockreward.mul(10**18);
        swaptoken_totalMint = _swaptoken_totalMint;
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }
    modifier swapTokenExist(address _swaptoken_addr){
        bool exist = false;
        if(swaptoken_last_reward_blocknum[_swaptoken_addr] != 0){
            exist = true;
        }
        require(exist,'Don`t have this token');
        _;
    }

    modifier onlySupportContracts(address _nftcontract) {
        require(supportNFTContracts[_nftcontract] == true,"nft not support.");
        _;
    }

    function updateAllSwaptokenInfo() internal{
        uint256 len = swaptoken_addrs.length;
        for (uint256 i = 0; i < len; ++i) {
            updateSwaptokenInfo(swaptoken_addrs[i]);
        }
    }

    function CreateLiquidSwap(address _liquid_swaptoken_addr,uint _swaptoken_weight,uint _swaptoken_start_block) onlyOwner external {
        require(swaptoken_last_reward_blocknum[_liquid_swaptoken_addr] == 0,"Token Exist");
        updateAllSwaptokenInfo();
        swaptoken_last_reward_blocknum[_liquid_swaptoken_addr] = SafeMath.max(block.number,_swaptoken_start_block);
        swaptoken_weight[_liquid_swaptoken_addr] = _swaptoken_weight;
        all_weight = all_weight.add( _swaptoken_weight);
        supportNFTContracts[_liquid_swaptoken_addr] = true;
        swaptoken_addrs.push(_liquid_swaptoken_addr);
        emit LiquidSwapTokenCreated(_liquid_swaptoken_addr,swaptoken_weight[_liquid_swaptoken_addr],all_weight);
    }
    function updateSwaptokenInfo(address swap_addr) public swapTokenExist(swap_addr){
        if(block.number > swaptoken_last_reward_blocknum[swap_addr]){
            uint256 swap_token_share = IERC721(swap_addr).balanceOf(address(this));
            if (swap_token_share > 0) {
                uint256 blocks = block.number.sub(swaptoken_last_reward_blocknum[swap_addr]);
                uint256 allReward = blocks.mul(perblockreward).mul(swaptoken_weight[swap_addr]) / all_weight;
                swaptoken_pershare_reward[swap_addr] = swaptoken_pershare_reward[swap_addr].add(allReward.mul(ACC_XKey_PRECISION) / swap_token_share);
            }
            swaptoken_last_reward_blocknum[swap_addr] = block.number;
        }
    }

    function ChangeSwaptokenWeight(address _swaptoken_addr ,uint32 weight) external swapTokenExist(_swaptoken_addr) onlyOwner {
        updateAllSwaptokenInfo();
        all_weight = all_weight.sub(swaptoken_weight[_swaptoken_addr]).add(weight);
        swaptoken_weight[_swaptoken_addr] = weight;
    }

    function GetAddrBalanceof(address _user)external view returns (uint){
        return IERCMint20(erc_mintaddr).balanceOf(_user);
    }
    function ChangeMintErcAddr(address _erc_mintaddr) external onlyOwner {
        erc_mintaddr = _erc_mintaddr;
    }
    function AddSwaptokenShare(address _swaptoken_addr,uint _swaptoken_tokenid) swapTokenExist(_swaptoken_addr) onlySupportContracts(_swaptoken_addr) external{
        require(swaptoken_had_mint < swaptoken_totalMint,"All token has been mint");
        updateSwaptokenInfo(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();

        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
        userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid] = true;
        swaptoken_user_share[_swaptoken_addr][msg.sender]= swaptoken_user_share[_swaptoken_addr][msg.sender].add(1);
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt.add(int256(swaptoken_pershare_reward[_swaptoken_addr]/ACC_XKey_PRECISION));
        IERC721(_swaptoken_addr).transferFrom(msg.sender,address(this),_swaptoken_tokenid);
        //IERC20(_swaptoken_addr).transferFrom(msg.sender,address(this),_swaptoken_amount);
        /*
                IERC721(_swaptoken_addr).transferFrom(msg.sender,address(this),_swaptoken_tokenid);
                uint preshare = swaptoken_user_share[_swaptoken_addr][msg.sender];
                uint start_block = swaptoken_user_payedblock[_swaptoken_addr][msg.sender];
                if(start_block != 0 && start_block > swaptoken_startnum[_swaptoken_addr]){
                    if(swaptoken_totalshare[_swaptoken_addr] > 0 && all_weight > 0 && preshare > 0){
                        calcreward(msg.sender,_swaptoken_addr,preshare,start_block);
                    }
                }
                userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid] = true;
                swaptoken_totalshare[_swaptoken_addr] = swaptoken_totalshare[_swaptoken_addr].add(1);
                swaptoken_user_share[_swaptoken_addr][msg.sender] = swaptoken_user_share[_swaptoken_addr][msg.sender].add(1);
                if(swaptoken_user_payedblock[_swaptoken_addr][msg.sender] == 0){
                    swaptoken_user_payedblock[_swaptoken_addr][msg.sender] = SafeMath.max(swaptoken_startnum[_swaptoken_addr],block.number);
                }
                */

    }
    function RemoveSwaptokenShare(address _swaptoken_addr,uint[] calldata _swaptoken_tokenids) swapTokenExist(_swaptoken_addr) onlySupportContracts(_swaptoken_addr)  external{
        require(swaptoken_user_share[_swaptoken_addr][msg.sender] >= _swaptoken_tokenids.length,"Dont Have Enough token to remove");
        updateSwaptokenInfo(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();

        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
        for(uint i = 0; i < _swaptoken_tokenids.length; i++) {
            require(userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenids[i]],"Dont have token");
            userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenids[i]] = false;
            swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt.sub(int256((swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION));
            swaptoken_user_share[_swaptoken_addr][msg.sender]= swaptoken_user_share[_swaptoken_addr][msg.sender].sub(1);
            IERC721(_swaptoken_addr).transferFrom(address(this),msg.sender,_swaptoken_tokenids[i]);
        }

        //IERC20(_swaptoken_addr).transfer(msg.sender,_swaptoken_amount);
        /*
                uint shares = swaptoken_user_share[_swaptoken_addr][msg.sender];
                uint start_block = swaptoken_user_payedblock[_swaptoken_addr][msg.sender];
                require(userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid],"Dont Have this tokenid to remove");
                if(swaptoken_totalshare[_swaptoken_addr] > 0 && all_weight > 0){
                    calcreward(msg.sender,_swaptoken_addr,shares,start_block);
                }
                swaptoken_user_share[_swaptoken_addr][msg.sender] = swaptoken_user_share[_swaptoken_addr][msg.sender].sub(1);
                swaptoken_totalshare[_swaptoken_addr] = swaptoken_totalshare[_swaptoken_addr].sub(1);
                userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid] = false;
                IERC721(_swaptoken_addr).transferFrom(address(this),msg.sender,_swaptoken_tokenid);*/
    }
    /*
    function calcreward(address user, address _swaptoken_addr, uint256 _user_shares,uint256 lastGetRewardBlock) internal {
        uint reward = 0;
        if(block.number >= lastGetRewardBlock){
            uint blockcounts = block.number.sub(lastGetRewardBlock);
            uint pricePerShare = perblockreward.mul(granularity)/ swaptoken_totalshare[_swaptoken_addr];
            pricePerShare = pricePerShare.mul(swaptoken_weight[_swaptoken_addr])/all_weight;
            reward = blockcounts.mul(_user_shares).mul(pricePerShare)/granularity;
            if(swaptoken_had_mint.add(reward) > swaptoken_totalMint){
                reward = swaptoken_totalMint.sub(swaptoken_had_mint);
            }
            swaptoken_user_payedblock[_swaptoken_addr][msg.sender] = block.number;
        }
        if(reward > 0){
            IERCMint20(erc_mintaddr).minerMint(user,reward);
            swaptoken_had_mint = swaptoken_had_mint.add(reward);
        }
    }*/
    function GetSwaptokenReward(address _swaptoken_addr) swapTokenExist(_swaptoken_addr) external{
        updateSwaptokenInfo(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt;
        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
    }

    function PredReward(address _swaptoken_addr) external swapTokenExist(_swaptoken_addr) view returns (uint){
        uint _swaptoken_pershare_reward = swaptoken_pershare_reward[_swaptoken_addr];
        if(block.number > swaptoken_last_reward_blocknum[_swaptoken_addr]){
            uint256 swap_token_share = IERC721(_swaptoken_addr).balanceOf(address(this));
            if (swap_token_share > 0) {
                uint256 blocks = block.number.sub(swaptoken_last_reward_blocknum[_swaptoken_addr]);
                uint256 allReward = blocks.mul(perblockreward).mul(swaptoken_weight[_swaptoken_addr]) / all_weight;
                _swaptoken_pershare_reward = swaptoken_pershare_reward[_swaptoken_addr].add(allReward.mul(ACC_XKey_PRECISION) / swap_token_share);
            }
        }
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(_swaptoken_pershare_reward)/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();
        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        return real_reward;
    }

    function ChangePerBlockReward(uint _perblockreward) external onlyOwner{
        updateAllSwaptokenInfo();
        perblockreward = _perblockreward;
    }
    function GetOwner() public view returns (address){
        return owner;
    }
    function GetUserShare(address _swaptoken_addr,address _user)public view returns (uint){
        return swaptoken_user_share[_swaptoken_addr][_user];
    }

    function GetUserIfhaveTokenid(address _swaptoken_addr,address _user,uint _tokenId)public view returns (bool){
        return userNFTTokenid[_user][_swaptoken_addr][_tokenId];
    }

}
