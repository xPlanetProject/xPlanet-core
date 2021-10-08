pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Strings.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IERCMint721.sol";

contract XSwapLPNFT is ERC721Full, Ownable {
    using Strings for string;

    struct PokerData {
        uint suit;
        uint rank;
        uint256 openBlock;
        address pair;
    }

    uint256 private _currentId = 0;
    address public minter;
    mapping (uint256 => PokerData) private _tokenData;

    modifier onlyMinter {
        require(msg.sender == minter, "onlyMinter: not minter");
        _;
    }

    constructor() public ERC721Full("xPlanet xPoker", "xPoker") {
    }

    function setMinter(address _minter) public onlyOwner {
        minter = _minter;
    }

    function mintUniqueTokenTo(address _pair, address _to) public onlyMinter returns(uint256){
        uint256 newTokenId = _currentId.add(1);
        _mint(_to, newTokenId);
        PokerData storage newToken = _tokenData[newTokenId];
        newToken.openBlock = block.number + 10;
        bytes32 h = keccak256(abi.encodePacked(newTokenId, blockhash(block.number)));
        newToken.rank = uint256(h) % 13 + 2;
        newToken.suit = uint256(h) % 4 + 1;
        newToken.pair = _pair;
        _currentId++;
        return newTokenId;
    }

    function testMint(address _pair, address _to, uint _suit, uint _rank) public onlyMinter returns(uint256) {
        uint256 newTokenId = _currentId.add(1);
        _mint(_to, newTokenId);
        PokerData storage newToken = _tokenData[newTokenId];
        newToken.openBlock = block.number + 10;
        newToken.suit = _suit;
        newToken.rank = _rank;
        newToken.pair = _pair;
        _currentId++;
        return newTokenId;
    }

    function getPokerProperty(uint256 _tokenId) external view returns (uint suit, uint rank) {
        require(_tokenId<=_currentId, "getPokerProperty: Invalid token id.");
        return (_tokenData[_tokenId].suit, _tokenData[_tokenId].rank);
    }

    function openLootBox(uint256 _tokenId) external {
        require(_tokenId>0, "zero token id.");
        require(_tokenId<=_currentId, "not assigned token id.");
        PokerData storage data = _tokenData[_tokenId];
        require(block.number>data.openBlock, "openLootBox: Not open block number.");
        bytes32 h = keccak256(abi.encodePacked(_tokenId, blockhash(data.openBlock)));
        data.rank = uint256(h) % 13 + 2;
        data.suit = uint256(h) % 4 + 1;
    }

    function baseTokenURI() public pure returns (string memory) {
        return "http://specialpoker.xplanet.io/";
    }

    function tokenURI(uint256 _tokenId) external view returns (string memory) {
        require(_tokenId<=_currentId, "tokenURI: Invalid token id.");
        return Strings.strConcat(baseTokenURI(), Strings.uint2str(_tokenId));
    }

    function getPair(uint256 _tokenId) public view returns(address) {
        require(_tokenId<=_currentId, "getPair: Invalid token id.");
        return _tokenData[_tokenId].pair;
    }
}

