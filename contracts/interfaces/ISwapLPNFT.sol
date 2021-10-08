pragma solidity >=0.5.0;

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface ISwapLPNFT{
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function setApprovalForAll(address operator, bool _approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function getPokerProperty(uint256 _tokenId) external view returns (uint color, uint number);
    function mintUniqueTokenTo(address _pair, address _to) external  returns(uint256);
    function getPair(uint256 _tokenId) external view returns(address);
    function testMint(address _pair,address _to, uint _suit, uint _rank) external returns(uint256);
}
