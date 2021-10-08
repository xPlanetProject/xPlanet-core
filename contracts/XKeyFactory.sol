pragma solidity =0.5.16;

import './interfaces/IXKeyFactory.sol';
import './XKeyPair.sol';

contract XKeyFactory is IXKeyFactory {

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;
    address public swapLPNFT;
    address public router_addr;
    address private owner;
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    modifier onlyOwner(){
        require(msg.sender == owner);
        _;
    }
    function getOwner() external view returns(address){
        return owner;
    }

    function pairCodeHash() external pure returns (bytes32) {
        return keccak256(type(XKeyPair).creationCode);
    }
    constructor(address _swapLPNFT) public {
        swapLPNFT = _swapLPNFT;
        owner = msg.sender;
    }

    function setRouter(address _router_addr)external onlyOwner{

        router_addr = _router_addr;
    }
    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'XKey: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'XKey: ZERO_ADDRESS');
        require(swapLPNFT != address(0),'swapLPNFT not set');
        require(router_addr != address(0),'router not set');
        require(getPair[token0][token1] == address(0), 'XKey: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(XKeyPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IXKeyPair(pair).initialize(token0, token1, swapLPNFT,router_addr);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}
