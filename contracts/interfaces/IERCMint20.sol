pragma solidity >=0.5.0;
interface IERCMint20 {
    function minerMint(address to,uint256 amount) external;
	function balanceOf(address owner) external view returns (uint);
}
