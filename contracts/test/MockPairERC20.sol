pragma solidity =0.5.16;

import './PairERC20.sol';


contract MockPairERC20 is PairERC20 {

    constructor() public {}
    
    function mint(uint256 tokenId, uint256 amount) external  {
        _mint(tokenId, amount);
    }
}

