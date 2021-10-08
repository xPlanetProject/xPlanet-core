pragma solidity=0.5.16;

import './libraries/SafeMath.sol';
import './interfaces/IERCMint20.sol';

contract XKeyToken is IERCMint20 {
    using SafeMath for uint;

    string public constant name = 'XKEY';
    string public constant symbol = 'XKEY';
    uint8 public constant decimals = 18;
    uint public constant max_mint_number = 1000000000 * (10 ** uint(decimals));
    uint public constant max_pre_number = 400000000 * (10 ** uint(decimals));
    uint public totalSupply;
    uint public totalMinterNumber;
    uint public totalReleaseNumber;
    mapping(address=>uint[2]) public minter_address_number;
    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;
    address public owner;

    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    modifier onlyOwner() {
        require(msg.sender == owner, "for contract owner only");
        _;
    }

    constructor() public {
        owner = msg.sender;
        balanceOf[msg.sender] = max_pre_number;
        totalSupply = max_pre_number;
    }

    function changeOwner(address new_owner) external onlyOwner() {
        owner = new_owner;
    }

    function _mint(address to, uint value) internal {
        require(totalSupply.add(value) <= max_mint_number, "Cannot mint coin over limit");
        balanceOf[to] = balanceOf[to].add(value);
        totalSupply = totalSupply.add(value);
        emit Transfer(address(0), to, value);
    }

    function _approve(address origen_owner, address spender, uint value) private {
        allowance[origen_owner][spender] = value;
        emit Approval(origen_owner, spender, value);
    }

    function _transfer(address from, address to, uint value) private {
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(from, to, value);
    }

    function setMintContract(address miner, uint total) external onlyOwner() {
        require(totalMinterNumber.add(total) <= max_mint_number, "max mint number exceeded");
        if (minter_address_number[miner][0] == 0 || minter_address_number[miner][1] <= total) {
            minter_address_number[miner][0] = total;
            totalMinterNumber.add(total);
        } else {
            revert("cannot set total number less than minted number");
        }
    }

    function minerMint(address to, uint value) external{
        require(minter_address_number[msg.sender][0] > 0, "invalid minter");
        uint realMint = minter_address_number[msg.sender][0] - minter_address_number[msg.sender][1];
        if(realMint > value){
            realMint = value;
        }
        require(realMint > 0, "nothing to mint");
        minter_address_number[msg.sender][1] = minter_address_number[msg.sender][1].add(realMint);
        _mint(to, realMint);
    }

    function approve(address spender, uint value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) external returns (bool) {
        if (allowance[from][msg.sender] != uint(-1)) {
            allowance[from][msg.sender] = allowance[from][msg.sender].sub(value);
        }
        _transfer(from, to, value);
        return true;
    }
}
