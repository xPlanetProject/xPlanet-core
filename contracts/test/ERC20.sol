pragma solidity =0.5.16;

import '../XKeyToken.sol';

contract ERC20 is XKeyToken {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
