pragma solidity=0.5.16;
import './libraries/SafeMath.sol';
import './libraries/SignedSafeMath.sol';
import './interfaces/IERCMint20.sol';
//import './interfaces/IERC20.sol';
import './interfaces/IXkeyPokerPower.sol';
import './interfaces/ISwapLPNFT.sol';
import './interfaces/IXKeyPair.sol';
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
contract XkeyDao is Ownable{
    using SafeMath  for uint;
    using SafeMath  for uint256;
    using SignedSafeMath for int256;
    /**
    * swap token info
    */
    mapping(address=>uint) public swaptoken_last_reward_blocknum;
    mapping(address=>uint) public swaptoken_weight;
    mapping(address=>uint) public swaptoken_pershare_reward;
    mapping(address=>uint) public swaptoken_current_stage;
    mapping(address=>uint) public swaptoken_allAmount;
    mapping(address=>uint) public swaptoken_hadmint;
    /**
    * user info
    */
    mapping(address=>mapping(address=>uint)) swaptoken_user_share;
    mapping(address=>mapping(address=>int)) swaptoken_user_rewardDebt;

    address[] public swaptoken_addrs;
    uint public perblockreward;
    uint public all_weight;
    address public erc_mintaddr;
    uint256 public swaptoken_had_mint;
    uint256 public constant swaptoken_totalMint = 100000000 * (10 ** uint(18));
    uint256 private constant ACC_XKey_PRECISION = 10 ** 12;
    //address owner;
    address public xkeyPokerPower;
    address public lpnft;
    uint public halfroundTimes = 7;
    uint public multipleNumber = 2;
    uint public priedLength;//3 month 598153
    uint public startBlocknum;
    uint constant public  composeStartBlockNum = 100000;
    event LiquidSwapTokenCreated(address,uint,uint);
    constructor(
        address _erc_mintaddr,
        address _xkeyPokerPower,
        address _lpnft,
        uint _perblockreward,
        uint _priedLength) public {
       // owner = msg.sender;
        erc_mintaddr =  _erc_mintaddr;
        perblockreward = _perblockreward.mul(10**18);
        xkeyPokerPower = _xkeyPokerPower;
        priedLength = _priedLength;
        lpnft = _lpnft;
    }
    uint private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, 'Xkey is locked');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    modifier swapTokenExist(address _swaptoken_addr){
        bool exist = false;
        if(swaptoken_last_reward_blocknum[_swaptoken_addr] != 0){
            exist = true;
        }
        require(exist,'Don`t have this token');
        _;
    }
    function updateAllSwaptokenInfo() internal{
        uint256 len = swaptoken_addrs.length;
        for (uint256 i = 0; i < len; ++i) {
            calcAllStagePrice(swaptoken_addrs[i]);
        }
    }

    function calcAllStagePrice(address swap_addr) internal {
        if(block.number > swaptoken_last_reward_blocknum[swap_addr] && startBlocknum != 0){
            uint256 current_start_number = startBlocknum.add(swaptoken_current_stage[swap_addr].mul(priedLength));
            uint256 pastStage = 0;
            if(block.number > current_start_number){
                uint256 blockInv = block.number.sub(current_start_number);
                pastStage = SafeMath.min(blockInv.div(priedLength),halfroundTimes);
                if(swaptoken_current_stage[swap_addr].add(pastStage) > halfroundTimes){
                    pastStage = halfroundTimes.sub(swaptoken_current_stage[swap_addr]);
                }
            }

            uint256 swap_token_share = swaptoken_allAmount[swap_addr];
            uint256 prevReward = perblockreward.div(2**(swaptoken_current_stage[swap_addr]));
            for(uint i = 1;i <= pastStage;i++){
                if(swaptoken_last_reward_blocknum[swap_addr] > current_start_number.add(i.mul(priedLength))){
                    prevReward= perblockreward.div((2**(i.add(swaptoken_current_stage[swap_addr]))));
                    continue;
                }
                uint blocksub = current_start_number.add(i.mul(priedLength)).sub(swaptoken_last_reward_blocknum[swap_addr]);
                if (swap_token_share > 0) {
                    //uint256 blocks = blocknum.sub(swaptoken_last_reward_blocknum[swap_addr]);
                    uint256 allReward = blocksub.mul(prevReward).mul(swaptoken_weight[swap_addr]) / all_weight;
                    swaptoken_pershare_reward[swap_addr] = swaptoken_pershare_reward[swap_addr].add(allReward.mul(ACC_XKey_PRECISION) / swap_token_share);
                }
                swaptoken_last_reward_blocknum[swap_addr] = current_start_number.add(i.mul(priedLength));
                prevReward= perblockreward.div((2 **(i.add(swaptoken_current_stage[swap_addr]))));

            }
            swaptoken_current_stage[swap_addr]= swaptoken_current_stage[swap_addr].add(pastStage);
        }
        updateSwaptokenInfo(swap_addr);
    }

    function createLiquidSwap(address _liquid_swaptoken_addr,
        uint _swaptoken_weight,
        uint _swaptoken_start_block) onlyOwner external {
        require(swaptoken_last_reward_blocknum[_liquid_swaptoken_addr] == 0,"Token exist");
        updateAllSwaptokenInfo();
        swaptoken_last_reward_blocknum[_liquid_swaptoken_addr] = SafeMath.max(_swaptoken_start_block,block.number);
        swaptoken_weight[_liquid_swaptoken_addr] = _swaptoken_weight;
        all_weight = all_weight.add( _swaptoken_weight);
        swaptoken_addrs.push(_liquid_swaptoken_addr);
        swaptoken_current_stage[_liquid_swaptoken_addr] = 0;
        emit LiquidSwapTokenCreated(_liquid_swaptoken_addr,swaptoken_weight[_liquid_swaptoken_addr],all_weight);
    }
    function updateSwaptokenInfo(address swap_addr) internal swapTokenExist(swap_addr) {

        if(block.number > swaptoken_last_reward_blocknum[swap_addr]){
            uint256 swap_token_share = swaptoken_allAmount[swap_addr];
            if (swap_token_share > 0) {
                uint256 reward = perblockreward .div(2 **(swaptoken_current_stage[swap_addr]));
                uint256 blocks = block.number.sub(swaptoken_last_reward_blocknum[swap_addr]);
                uint256 allReward = blocks.mul(reward).mul(swaptoken_weight[swap_addr]) / all_weight;
                swaptoken_pershare_reward[swap_addr] = swaptoken_pershare_reward[swap_addr].add(allReward.mul(ACC_XKey_PRECISION) / swap_token_share);
            }
            swaptoken_last_reward_blocknum[swap_addr] = block.number;
        }
    }
    function getAddrBalanceof(address _user)external view returns (uint){
        return IERCMint20(erc_mintaddr).balanceOf(_user);
    }
    function changeMintErcAddr(address _erc_mintaddr) external onlyOwner {
        erc_mintaddr = _erc_mintaddr;
    }
    function setStartBlocknum(uint _block_number) external onlyOwner{
        require(startBlocknum == 0,"has start ");
        startBlocknum = _block_number;
    }
    function tansferNFTIn(address from,address nft_address,uint256 tokenId) internal{
        require(ISwapLPNFT(nft_address).ownerOf(tokenId) != address(this),"this nft is blongs to xkeydao");
        ISwapLPNFT(nft_address).transferFrom(from,address(this),tokenId);
        require(ISwapLPNFT(nft_address).ownerOf(tokenId) == address(this),"dont get nft");
    }
    function transferNFTout(address to,address nft_address,uint256 tokenId) internal {
        require(ISwapLPNFT(nft_address).ownerOf(tokenId) == address(this),"this nft isn`t blongs to xkeydao");
        ISwapLPNFT(nft_address).transferFrom(address(this),to,tokenId);
        require(ISwapLPNFT(nft_address).ownerOf(tokenId) == to,"dont get nft");
    }
    function addSwaptokenShareSingle(uint256[] calldata _tokenIds)lock external{
        require(swaptoken_had_mint < swaptoken_totalMint,"All token has been mint");
        require(_tokenIds.length <= 5,"token ids size should lower than 5");
        if(startBlocknum == 0){
            startBlocknum = block.number;
        }
        address _swaptoken_addr = ISwapLPNFT(lpnft).getPair(_tokenIds[0]);
        require(swaptoken_last_reward_blocknum[_swaptoken_addr] != 0,"dont have this token ids");
        uint256 realAmount = 0;
        calcAllStagePrice(_swaptoken_addr);
        for(uint i = 0;i < _tokenIds.length;i++){
            require(ISwapLPNFT(lpnft).getPair(_tokenIds[i]) == _swaptoken_addr,"xkeydao:tokenids arent same pair");
            tansferNFTIn(msg.sender,lpnft,_tokenIds[i]);
            realAmount = realAmount.add(IXkeyPokerPower(xkeyPokerPower).stake(msg.sender, IPairERC20(_swaptoken_addr),_tokenIds[i]));
        }

        //address _swaptoken_addr = ISwapLPNFT(lpnft).getPair(_tokenId);
        //tansferNFTIn(msg.sender,IXKeyPair(_swaptoken_addr).nft(),_tokenId);
        //uint256 swapAmountBeforeTrans = IERC20(_swaptoken_addr).balanceOf(address(this));
        //IERC20(_swaptoken_addr).transferFrom(msg.sender,address(this),_swaptoken_amount);
        //uint256 swapAmountAfterTrans = IERC20(_swaptoken_addr).balanceOf(address(this));
        //uint256 realAmount = swapAmountAfterTrans.sub(swapAmountBeforeTrans);


        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();

        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            swaptoken_hadmint[_swaptoken_addr] = swaptoken_hadmint[_swaptoken_addr].add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
        swaptoken_user_share[_swaptoken_addr][msg.sender]= swaptoken_user_share[_swaptoken_addr][msg.sender].add(realAmount);
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt.add(int256(realAmount.mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION));
        swaptoken_allAmount[_swaptoken_addr] = swaptoken_allAmount[_swaptoken_addr].add(realAmount);

    }
    function addSwaptokenShareCombine(uint256[5] calldata _tokenIds)lock external{
        require(block.number > startBlocknum + composeStartBlockNum);
        require(swaptoken_had_mint < swaptoken_totalMint,"All token has been mint");
        /*
        if(startBlocknum == 0){
            startBlocknum = block.number;
        }
        */
        address _swaptoken_addr = ISwapLPNFT(lpnft).getPair(_tokenIds[0]);
        require(swaptoken_last_reward_blocknum[_swaptoken_addr] != 0,"dont have this token ids");
        calcAllStagePrice(_swaptoken_addr);
        for(uint i = 0;i < _tokenIds.length;i++){
            require(ISwapLPNFT(lpnft).getPair(_tokenIds[i]) == _swaptoken_addr,"xkeydao:tokenids arent same pair");
            tansferNFTIn(msg.sender,lpnft,_tokenIds[i]);
        }

        /*
        uint256 swapAmountBeforeTrans = IERC20(_swaptoken_addr).balanceOf(address(this));
        IERC20(_swaptoken_addr).transferFrom(msg.sender,address(this),_swaptoken_amount);
        uint256 swapAmountAfterTrans = IERC20(_swaptoken_addr).balanceOf(address(this));
        */
        uint256 realAmount = IXkeyPokerPower(xkeyPokerPower).stakeComposite(msg.sender, IPairERC20(_swaptoken_addr),_tokenIds);

        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();

        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            swaptoken_hadmint[_swaptoken_addr] = swaptoken_hadmint[_swaptoken_addr].add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
        swaptoken_user_share[_swaptoken_addr][msg.sender]= swaptoken_user_share[_swaptoken_addr][msg.sender].add(realAmount);
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt.add(int256(realAmount.mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION));
        swaptoken_allAmount[_swaptoken_addr] = swaptoken_allAmount[_swaptoken_addr].add(realAmount);
    }
    function removeSwaptokenShareSingle(uint256[] calldata _tokenIds) lock external{
        require(_tokenIds.length <= 5,"token ids size should lower than 5");
        address _swaptoken_addr = ISwapLPNFT(lpnft).getPair(_tokenIds[0]);
        uint256 _swaptoken_amount = 0;
        for(uint i = 0;i < _tokenIds.length;i++){
            require(ISwapLPNFT(lpnft).getPair(_tokenIds[i]) == _swaptoken_addr,"this token id was not same pair");
            _swaptoken_amount = _swaptoken_amount.add( IXkeyPokerPower(xkeyPokerPower).unstake(msg.sender, _tokenIds[i]));
        }
        //address _swaptoken_addr = ISwapLPNFT(lpnft).getPair(_tokenId);
        //uint256 _swaptoken_amount = IXkeyPokerPower(xkeyPokerPower).unstake(msg.sender, _tokenId);
        require(swaptoken_user_share[_swaptoken_addr][msg.sender] >= _swaptoken_amount,"Dont Have Enough token to remove");
        calcAllStagePrice(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();

        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }

        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            swaptoken_hadmint[_swaptoken_addr] = swaptoken_hadmint[_swaptoken_addr].add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt.sub(int256(_swaptoken_amount.mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION));
        swaptoken_user_share[_swaptoken_addr][msg.sender]= swaptoken_user_share[_swaptoken_addr][msg.sender].sub(_swaptoken_amount);
        for(uint i = 0;i < _tokenIds.length;i++){
            transferNFTout(msg.sender,IXKeyPair(_swaptoken_addr).nft(),_tokenIds[i]);
        }

        swaptoken_allAmount[_swaptoken_addr] = swaptoken_allAmount[_swaptoken_addr].sub(_swaptoken_amount);
    }
    function removeSwaptokenShareCombine(uint256 index) lock external{
        uint256[5] memory tokenIds = IXkeyPokerPower(xkeyPokerPower).getTokenIdsByIndex(msg.sender, index);
        address _swaptoken_addr = ISwapLPNFT(lpnft).getPair(tokenIds[0]);
        for(uint i = 0;i < tokenIds.length;i++){
            require(ISwapLPNFT(lpnft).getPair(tokenIds[i]) == _swaptoken_addr,"this token id was not same pair");
        }

        require(swaptoken_last_reward_blocknum[_swaptoken_addr] != 0,"dont have this token");
        uint256 _swaptoken_amount = IXkeyPokerPower(xkeyPokerPower).unstakeComposite(msg.sender, index);
        require(swaptoken_user_share[_swaptoken_addr][msg.sender] >= _swaptoken_amount,"Dont Have Enough token to remove");
        calcAllStagePrice(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();

        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            swaptoken_hadmint[_swaptoken_addr] = swaptoken_hadmint[_swaptoken_addr].add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt.sub(int256(_swaptoken_amount.mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION));
        swaptoken_user_share[_swaptoken_addr][msg.sender]= swaptoken_user_share[_swaptoken_addr][msg.sender].sub(_swaptoken_amount);

        for(uint i = 0;i < 5;i++){
            transferNFTout(msg.sender,lpnft,tokenIds[i]);
        }
        swaptoken_allAmount[_swaptoken_addr]= swaptoken_allAmount[_swaptoken_addr].sub(_swaptoken_amount);
    }
    function getSwaptokenReward(address _swaptoken_addr) swapTokenExist(_swaptoken_addr) lock external{

        calcAllStagePrice(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(swaptoken_pershare_reward[_swaptoken_addr])/ACC_XKey_PRECISION);
        require(user_rewardDebt >= swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender],"How 2??");
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();
        swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender] = user_rewardDebt;
        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        if (real_reward != 0) {
            swaptoken_had_mint = swaptoken_had_mint.add(real_reward);
            swaptoken_hadmint[_swaptoken_addr] = swaptoken_hadmint[_swaptoken_addr].add(real_reward);
            IERCMint20(erc_mintaddr).minerMint(msg.sender,real_reward);
        }
    }
    function prereward(address _swaptoken_addr) internal view returns (uint256){
        uint _swaptoken_pershare_reward = swaptoken_pershare_reward[_swaptoken_addr];
        uint256 swap_token_share = swaptoken_allAmount[_swaptoken_addr];
        uint256 last_blocknum_temp = swaptoken_last_reward_blocknum[_swaptoken_addr];
        uint256 current_stage_Temp = swaptoken_current_stage[_swaptoken_addr];
        if(block.number > swaptoken_last_reward_blocknum[_swaptoken_addr] && startBlocknum != 0){
            uint256 current_start_number = startBlocknum.add(swaptoken_current_stage[_swaptoken_addr].mul(priedLength));
            uint256 pastStage = 0;
            if(block.number > current_start_number){
                uint256 blockInv = block.number.sub(current_start_number);
                pastStage = SafeMath.min(blockInv.div(priedLength),halfroundTimes);
                if(swaptoken_current_stage[_swaptoken_addr].add(pastStage) > halfroundTimes){
                    pastStage = halfroundTimes.sub(swaptoken_current_stage[_swaptoken_addr]);
                }
            }
            uint256 prevReward = perblockreward.div(2**(swaptoken_current_stage[_swaptoken_addr]));
            for(uint i = 1;i <= pastStage;i++){
                if(last_blocknum_temp > current_start_number.add(i.mul(priedLength))){
                    prevReward= perblockreward.div((2**(i.add(swaptoken_current_stage[_swaptoken_addr]))));
                    continue;
                }
                uint blocksub = current_start_number.add(i.mul(priedLength)).sub(last_blocknum_temp);
                //uint reward = perblockreward /(2 **(i.add(swaptoken_current_stage[_swaptoken_addr])));
                if (swap_token_share > 0) {
                    //uint256 blocks = blocknum.sub(swaptoken_last_reward_blocknum[swap_addr]);
                    uint256 allReward = blocksub.mul(prevReward).mul(swaptoken_weight[_swaptoken_addr]) / all_weight;
                    _swaptoken_pershare_reward = _swaptoken_pershare_reward.add(allReward.mul(ACC_XKey_PRECISION) / swap_token_share);
                }
                prevReward= perblockreward.div((2**(i.add(swaptoken_current_stage[_swaptoken_addr]))));
                last_blocknum_temp = current_start_number.add(i.mul(priedLength));
                current_stage_Temp = swaptoken_current_stage[_swaptoken_addr].add(pastStage);
            }
        }
        if(block.number > swaptoken_last_reward_blocknum[_swaptoken_addr]){

            if (swap_token_share > 0) {
                uint256 reward = perblockreward /(2 **(current_stage_Temp));
                uint256 blocks = block.number.sub(last_blocknum_temp);
                uint256 allReward = blocks.mul(reward).mul(swaptoken_weight[_swaptoken_addr]) / all_weight;
                _swaptoken_pershare_reward = _swaptoken_pershare_reward.add(allReward.mul(ACC_XKey_PRECISION) / swap_token_share);
            }
        }
        return _swaptoken_pershare_reward;
    }
    function predReward(address _swaptoken_addr) public swapTokenExist(_swaptoken_addr) view returns (uint){
        uint256 _swaptoken_pershare_reward = prereward(_swaptoken_addr);
        int256 user_rewardDebt = int256(swaptoken_user_share[_swaptoken_addr][msg.sender].mul(_swaptoken_pershare_reward)/ACC_XKey_PRECISION);
        uint256 user_reward = user_rewardDebt.sub( swaptoken_user_rewardDebt[_swaptoken_addr][msg.sender]).toUInt256();
        uint real_reward = user_reward;
        if(swaptoken_had_mint.add(user_reward) > swaptoken_totalMint){
            real_reward = swaptoken_totalMint.sub(swaptoken_had_mint);
        }
        return real_reward;
    }
    function changeSwaptokenWeight(address _swaptoken_addr,uint new_weight) external onlyOwner swapTokenExist(_swaptoken_addr){
        updateAllSwaptokenInfo();
        all_weight = all_weight.sub(swaptoken_weight[_swaptoken_addr]).add(new_weight);
        swaptoken_weight[_swaptoken_addr] = new_weight;
    }
    function getCurrentStagePrice()public view returns (uint256){
        if(startBlocknum == 0){
            return perblockreward;
        }
        uint256 blockInv = block.number.sub(startBlocknum);
        uint256 stageNum = SafeMath.min(blockInv.div(priedLength),halfroundTimes);

        return perblockreward.div(2 **(stageNum));
    }
    function getUserShare(address _swaptoken_addr,address _user)public view returns (uint){
        return swaptoken_user_share[_swaptoken_addr][_user];
    }
}
