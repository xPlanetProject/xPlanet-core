pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import './libraries/SafeMath.sol';
import './libraries/SignedSafeMath.sol';
import './interfaces/ISwapLPNFT.sol';
import './interfaces/IPairERC20.sol';
import './interfaces/IXkeyPokerPower.sol';

contract XPokerPower is IXkeyPokerPower, Ownable {
    using SafeMath for uint;
    using SignedSafeMath for int256;

    struct SinglePokerPower {
        uint256 tokenId;
        uint256 power;
    }

    struct CompositePokerPower {
        uint256[5] tokenIds;
        uint256 power;
    }

    struct Poker {
        uint256 suit;
        uint256 rank;
    }

    ISwapLPNFT XPOKER;
    mapping(address => SinglePokerPower[]) public singlePokerPower;
    mapping(address => CompositePokerPower[]) public compositePokers;
    mapping(address => uint) public singleLength;
    mapping(address => uint) public compositeLength;
    mapping(address => uint) public swapTokenSingleLength;
    mapping(address => uint) public swapTokenCompositeLength;
    mapping(address => uint) public swapTokenAllLiquid;
    constructor(ISwapLPNFT _xpoker) public {
        XPOKER = _xpoker;
    }

    function stake(address user, IPairERC20 pair, uint256 tokenId) external onlyOwner returns (uint256) {

        uint suit;
        uint rank;
        (suit, rank) = XPOKER.getPokerProperty(tokenId);
        uint256 power = 0;
        uint256 liquid = pair.balanceOf(tokenId);
        swapTokenAllLiquid[address(pair)] = swapTokenAllLiquid[address(pair)].add(liquid);
        power = rank.mul(liquid);
        require(power>0, "stake: zero power.");
        if(singleLength[user] < singlePokerPower[user].length){
            singlePokerPower[user][singleLength[user]].tokenId = tokenId;
            singlePokerPower[user][singleLength[user]].power = power;
        }
        else{
            SinglePokerPower memory p;
            p.tokenId = tokenId;
            p.power = power;
            singlePokerPower[user].push(p);
        }

        singleLength[user] = singleLength[user] + 1;
        swapTokenSingleLength[address(pair)] = swapTokenSingleLength[address(pair)].add(1);
        return power;
    }

    function stakeComposite(address user, IPairERC20 pair, uint256[5] calldata tokenIds) external onlyOwner returns(uint256) {
        uint totalNumber = 0;
        uint totalLp = 0;
        Poker[5] memory poker;
        bool isFlush = true;
        bool isStraight = true;
        uint state = 0;  // 0 - High Card, 1 - One Pair, 2 - One Pair End, 3 - Three, 4 - Three End, 5 - Tow Pair, 6 - Full House, 7 - Four
        for (uint i=0; i<5; i++) {
            require(tokenIds[i] > 0, "stakeComposite: Invalid token id.");
            (poker[i].suit, poker[i].rank) = XPOKER.getPokerProperty(tokenIds[i]);
            totalNumber = totalNumber + poker[i].rank;
            uint256 lp = pair.balanceOf(tokenIds[i]);
            totalLp = totalLp + lp;
            if(i>0 && poker[i].suit != poker[i-1].suit && isFlush) {
                isFlush = false;
            }
            for (uint j=i; j>0; j--) {
                if (poker[j].rank <= poker[j-1].rank) {
                    if (poker[j].rank == poker[j-1].rank) {
                        require(poker[j-1].suit!=poker[j].suit, "stakeComposite: Cannot add same poker.");
                    }
                    uint tmp = poker[j-1].rank;
                    poker[j-1].rank = poker[j].rank;
                    poker[j].rank = tmp;
                    tmp = poker[j-1].suit;
                    poker[j-1].suit = poker[j].suit;
                    poker[j].suit = tmp;
                }
            }
        }
        for (uint x=1; x<5; x++) {
            if (poker[x].rank == poker[x-1].rank) {
                isStraight = false;
                if (state == 0) {
                    state = 1;
                } else if (state == 1) {
                    state = 3;
                } else if (state == 2) {
                    state = 5;
                } else if (state == 3) {
                    state = 7;
                } else if (state == 5 || state == 4) {
                    state = 6;
                }
            } else {
                if (poker[x].rank != (poker[x-1].rank + 1)) {
                    isStraight = false;
                }
                if (state == 1) {
                    state = 2;
                } else if (state == 3) {
                    state = 4;
                }
            }
        }
        if (isFlush) {
            if (isStraight) {
                if (poker[0].rank == 10) {
                    totalNumber = (totalNumber + 1000) * totalLp;
                } else {
                    totalNumber = (totalNumber + 455) * totalLp;
                }
            } else {
                totalNumber = (totalNumber + 275) * totalLp;
            }
        } else {
            if (state == 7) {
                totalNumber = (totalNumber + 395) * totalLp;
            } else if (state == 1 || state == 2) {
                totalNumber = (totalNumber + 55) * totalLp;
            } else if (state == 3 || state == 4) {
                totalNumber = (totalNumber + 165) * totalLp;
            } else if (state == 5) {
                totalNumber = (totalNumber + 110) * totalLp;
            } else if (state == 6) {
                totalNumber = (totalNumber + 335) * totalLp;
            } else {
                if (isStraight) {
                    totalNumber = (totalNumber + 215) * totalLp;
                } else {
                    totalNumber = (totalNumber + 15) * totalLp;
                }
            }
        }

        if(compositeLength[user] < compositePokers[user].length){
            compositePokers[user][compositeLength[user]].tokenIds = tokenIds;
            compositePokers[user][compositeLength[user]].power = totalNumber;
        }
        else{
            CompositePokerPower memory cPokers = CompositePokerPower(tokenIds, totalNumber);
            compositePokers[user].push(cPokers);
        }
        compositeLength[user] = compositeLength[user] + 1;
        swapTokenCompositeLength[address(pair)] = swapTokenCompositeLength[address(pair)].add(1);
        swapTokenAllLiquid[address(pair)] = swapTokenAllLiquid[address(pair)].add(totalLp);
        return totalNumber;
    }

    function getTokenIdsByIndex(address user, uint256 index) external view returns(uint256[5] memory) {
        uint256 length = compositeLength[user];
        require(index<length, "getTokenIdsByIndex: invalid index.");
        return compositePokers[user][index].tokenIds;
    }

    function getTokenIdByIndex(address user, uint256 index) external view returns(uint256) {
        uint256 length = singleLength[user];
        require(index<length, "getTokenIdByIndex: invalid index.");
        return singlePokerPower[user][index].tokenId;
    }

    function getSinglePowerdByIndex(address user, uint256 index) external view returns(uint256) {
        uint256 length = singleLength[user];
        require(index<length, "getSinglePowerdByIndex: invalid index.");
        return singlePokerPower[user][index].power;
    }

    function getCompositePowerdByIndex(address user, uint256 index) external view returns(uint256) {
        uint256 length = compositeLength[user];
        require(index<length, "getCompositePowerdByIndex: invalid index.");
        return compositePokers[user][index].power;
    }

    function unstake(address user, uint256 tokenId) external onlyOwner returns (uint256) {
        SinglePokerPower[] memory tokens = singlePokerPower[user];
        uint256 length = singleLength[user];
        uint256 power = 0;
        address pair = XPOKER.getPair(tokenId);
        for (uint i=0; i<length; i++) {
            if (tokens[i].tokenId == tokenId) {
                power = tokens[i].power;
                singlePokerPower[user][i] = singlePokerPower[user][length-1];
                singleLength[user] = singleLength[user] - 1;
                swapTokenSingleLength[pair] = swapTokenSingleLength[pair].sub(1);
                delete singlePokerPower[user][length-1];
                break;
            }
        }
        require(power>0, "unstake: invalid power.");
        swapTokenAllLiquid[address(pair)] = swapTokenAllLiquid[address(pair)].sub(IPairERC20(pair).balanceOf(tokenId));
        return power;
    }

    function unstakeComposite(address user, uint256 index) external onlyOwner returns (uint256) {
        uint256 length = compositeLength[user];
        require(index<length, "unstakeComposite: invalid index.");
        CompositePokerPower storage cpp = compositePokers[user][index];
        CompositePokerPower memory cpe = compositePokers[user][length-1];
        uint256 power = cpp.power;
        uint256 tokenId = cpp.tokenIds[0];
        address pair = XPOKER.getPair(tokenId);
        uint totallp = 0;
        for (uint i=0; i<cpp.tokenIds.length; i++) {
            uint256 lp = IPairERC20(pair).balanceOf(cpp.tokenIds[i]);
            totallp = totallp.add(lp);
        }
        cpp.tokenIds = cpe.tokenIds;
        cpp.power = cpe.power;
        compositeLength[user] = compositeLength[user] - 1;
        swapTokenAllLiquid[address(pair)] = swapTokenAllLiquid[address(pair)].sub(totallp);
        swapTokenCompositeLength[pair] = swapTokenCompositeLength[pair].sub(1);
        delete compositePokers[user][length-1];
        return power;
    }

}

