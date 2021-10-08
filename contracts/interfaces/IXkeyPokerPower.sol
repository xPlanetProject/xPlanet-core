pragma solidity >=0.5.0;

import './IPairERC20.sol';

interface IXkeyPokerPower {
    function stake(address user, IPairERC20 pair, uint256 tokenId) external returns (uint256);
    function stakeComposite(address user, IPairERC20 pair, uint256[5] calldata tokenIds) external returns(uint256);
    function getTokenIdsByIndex(address user, uint256 index) external view returns(uint256[5] memory);
    function getTokenIdByIndex(address user, uint256 index) external view returns(uint256);
    function getSinglePowerdByIndex(address user, uint256 index) external view returns(uint256);
    function getCompositePowerdByIndex(address user, uint256 index) external view returns(uint256);
    function unstake(address user, uint256 tokenId) external returns (uint256);
    function unstakeComposite(address user, uint256 index) external returns (uint256);
}
