// SPDX-License-Identifier: MIT

pragma solidity >=0.5.0;

import "./libraries/SafeMath.sol";

contract PairERC20 {
    using SafeMath for uint256;
    mapping (uint256 => uint256) private _balances;

    uint256 public totalSupply;

    string public constant name = 'Pair ERC';
    string public constant symbol = 'PAIRERC20';
    uint256 public constant decimal = 10 ** 18;
    event Transfer(uint256 fromToken, uint256 toToken, uint256 value);
    constructor() public {}
    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(uint256 tokenId) public view returns (uint256) {
        return _balances[tokenId];
    }
    function transferburn(uint256 amount) internal{
        _balances[0] = amount;
    }
    function _mint(uint256 tokenId, uint256 amount) internal  {
        require(tokenId != 0, "ERC20: mint to the zero tokenID");

       //_beforeTokenTransfer(address(0), account, amount);

        totalSupply= totalSupply.add(amount);
        _balances[tokenId] = _balances[tokenId].add(amount);
        emit Transfer(0, tokenId, amount);
    }

    function _add_min_liquid(uint amount) internal {
        if(totalSupply == 0){
            totalSupply = amount;
        }
    }

    function _burn(uint256 tokenId, uint256 amount) internal  {
        require(tokenId != 0, "ERC20: burn from the zero address");

        //_beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[tokenId];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        _balances[tokenId] = accountBalance.sub(amount);
        totalSupply= totalSupply.sub( amount);
        _balances[0] = 0;
        emit Transfer(tokenId, 0, amount);
    }

}
