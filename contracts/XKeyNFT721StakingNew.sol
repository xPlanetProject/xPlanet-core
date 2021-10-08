pragma solidity=0.5.16;

import './libraries/SafeMath.sol';
import './libraries/SignedSafeMath.sol';
import "./interfaces/IERCMint721.sol";
import './interfaces/IERC721.sol';

contract XKeyNFT721StakingNew {
    using SafeMath  for uint;
    using SignedSafeMath for int256;

    address public owner;
    address public erc721_mintaddr;
    uint256 public swaptoken_had_mint;
//    uint256 public swaptoken_totalMint;
    // user=>nft=>tokenid=>bool
    mapping(address=>mapping(address=>mapping(uint=>bool))) userNFTTokenid;
    // user=>poolid=>bool
    mapping(address=>mapping(uint=>bool)) userNFTInPool;
    // user=>poolid=>uint
    mapping(address=>mapping(uint=>uint)) userJoinPoolTime;

    mapping(address=>bool) public supportNFTContracts;
    //pool=>duration,1:gold,2:silver,3:copper
    //totalmint
    uint poolTotalmint;
    //totalhadmint
    uint poolTotalhadmint;
    //pool=>exist
    mapping(uint=>bool) poolExist;
    //pool=>closeat
    mapping(uint=>uint) poolCloseat;
    //pool=>start
    mapping(uint=>uint) poolStart;

    // user=>poolid=>starttime
    mapping(address=>mapping(uint=>bool)) userStakingStartTime;
    event PoolCreated(bool,uint,uint);

    constructor(
        address _erc721_mintaddr) public {
        owner = msg.sender;
        erc721_mintaddr =  _erc721_mintaddr;
//        swaptoken_totalMint = _swaptoken_totalMint;

        poolExist[1] = true;
        poolStart[1] = now;
        poolCloseat[1] = now.add(15 days);
        emit PoolCreated(poolExist[1],poolStart[1],poolCloseat[1]);

        poolExist[2] = true;
        poolStart[2] = now;
        poolCloseat[2] = now.add(15 days);
        emit PoolCreated(poolExist[2],poolStart[2],poolCloseat[2]);

        poolExist[3] = true;
        poolStart[3] = now;
        poolCloseat[3] = now.add(15 days);
        emit PoolCreated(poolExist[3],poolStart[3],poolCloseat[3]);
    }

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    modifier onlySupportContracts(address _nftcontract) {
        require(supportNFTContracts[_nftcontract] == true,"nft not support.");
        _;
    }

    modifier poolIfExist(uint  _poolid) {
        require(_poolid==1 || _poolid==2 || _poolid==3,"poolid not exist.");
        _;
    }

    function initSupportNFT(address[] calldata _nftContracts) onlyOwner external {
        require(_nftContracts.length > 0,"support contracts can not be empty.");
        for(uint i = 0; i < _nftContracts.length; i++) {
            supportNFTContracts[_nftContracts[i]] = true;
        }
    }

    function changeMintErcAddr(address _erc721_mintaddr) external onlyOwner {
        erc721_mintaddr = _erc721_mintaddr;
    }

//    function ChangePoolStart(uint poolid,address user) external onlyOwner {
//        userJoinPoolTime[user][poolid] = (userJoinPoolTime[user][poolid]).sub(8 days);
//    }

    function closePool(uint poolid) poolIfExist(poolid) external onlyOwner {
        poolExist[poolid] = false;
    }

    function openPool(uint poolid)  poolIfExist(poolid) external onlyOwner {
        poolExist[poolid] = true;
        poolStart[poolid] = now;
        poolCloseat[poolid] = now.add(15 days);

    }

    function addNFT721(address _swaptoken_addr,uint _swaptoken_tokenid,uint poolid) onlySupportContracts(_swaptoken_addr) poolIfExist(poolid) external{
        require(IERCMint721(erc721_mintaddr).ifMintEnd() == false,"All token has been mint");
        require(poolExist[poolid] == true,"Pool is closed");
        require(poolStart[poolid] <= now,"Pool have not start");
        require(poolCloseat[poolid] >= now,"Pool startime more than 15 days");
        require(userNFTInPool[msg.sender][poolid] == false,"This user has join this pool");

        userNFTInPool[msg.sender][poolid] = true;
        userJoinPoolTime[msg.sender][poolid] = now;
        userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid] = true;
        require(IERC721(_swaptoken_addr).ownerOf(_swaptoken_tokenid) != address(this),"this tokenid has transfer to me");
        IERC721(_swaptoken_addr).transferFrom(msg.sender,address(this),_swaptoken_tokenid);
        require(IERC721(_swaptoken_addr).ownerOf(_swaptoken_tokenid) == address(this),"this tokenid has transfer to me");
    }

    function removeNFT721(address _swaptoken_addr,uint _swaptoken_tokenid,uint poolid) onlySupportContracts(_swaptoken_addr) poolIfExist(poolid) external {
        require(userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid] == true,"Dont have token");
        require(userNFTInPool[msg.sender][poolid] == true,"This user has not join this pool");

        userNFTTokenid[msg.sender][_swaptoken_addr][_swaptoken_tokenid] = false;
        userNFTInPool[msg.sender][poolid] = false;
        if (poolid == 1 && now.sub(userJoinPoolTime[msg.sender][poolid]) > 7 days) {
            IERCMint721(erc721_mintaddr).mintGold(msg.sender);
        } else if (poolid == 2 && now.sub(userJoinPoolTime[msg.sender][poolid]) > 4 days) {
            IERCMint721(erc721_mintaddr).mintSilver(msg.sender);
        } else if (poolid == 3 && now.sub(userJoinPoolTime[msg.sender][poolid]) > 2 days) {
            IERCMint721(erc721_mintaddr).mintCopper(msg.sender);
        }
        IERC721(_swaptoken_addr).transferFrom(address(this),msg.sender,_swaptoken_tokenid);
    }

    function getPoolStatus(uint poolid) poolIfExist(poolid) external view returns (bool) {
        return poolExist[poolid];
    }

    function getPoolStart(uint poolid) poolIfExist(poolid) external view returns (uint) {
        return poolStart[poolid];
    }

    function getPoolCloseat(uint poolid) poolIfExist(poolid) external view returns (uint) {
        return poolCloseat[poolid];
    }
    function getUserIfInpool(address useraddr,uint poolid) poolIfExist(poolid) external view returns (bool) {
        return userNFTInPool[useraddr][poolid];
    }


    function getOwner() public view returns (address){
        return owner;
    }
}
