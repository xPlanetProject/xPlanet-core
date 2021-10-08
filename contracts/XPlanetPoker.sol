pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Strings.sol";
import "./interfaces/IERC20.sol";

contract XPlanetPoker is ERC721Full, Ownable {
    using Strings for string;
    uint256 private _currentTokenId = 0;
    uint256 private _price = 100 * (10 ** 18);
    uint private _maxCardNum = 52 * 200;
    address private _xkeyAddr;
    address private _fundAddr;
    uint private unlocked = 1;

    modifier lock() {
        require(unlocked == 1, 'Xkey is locked');
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor(
        address _xkey,
        address _fund
    ) public ERC721Full("XPOKER", "XPK") {
        _xkeyAddr = _xkey;
        _fundAddr = _fund;
    }

    function setTotalCards(uint _count) public onlyOwner {
        require(_count>_maxCardNum, "Not premitted to set smaller count.");
        _maxCardNum = _count;
    }

    function getRevenue(address _to) public onlyOwner {
        uint256 revenue = IERC20(_xkeyAddr).balanceOf(address(this));
        require(revenue>0, "No revenue.");
        IERC20(_xkeyAddr).transferFrom(address(this), _to, revenue);
    }

    function openLootBox(uint _count) lock public {
        require(_count > 0, "Count should > 0.");
        require(_count <= 5, "Limit to maximum 5 mints.");
        require(_currentTokenId+_count<=_maxCardNum, "No more poker.");
        uint256 pay = _price.mul(_count);
        require(IERC20(_xkeyAddr).balanceOf(msg.sender) >= pay, "Not enough XKey to mint.");
        IERC20(_xkeyAddr).transferFrom(msg.sender, address(this), pay);
        uint256 thisBalance = IERC20(_xkeyAddr).balanceOf(address(this));
        require(thisBalance>=pay, "Not enough balance to mint.");
        for (uint i=0; i<_count; i++) {
            uint256 newTokenId = _getNextTokenId();
            _mint(msg.sender, newTokenId);
            _incrementTokenId();
        }
        uint256 burnNum = pay.mul(5).div(100);
        require(thisBalance > burnNum, "burnNum bigger.");
        IERC20(_xkeyAddr).transfer(address(0), burnNum);
        IERC20(_xkeyAddr).transfer(_fundAddr, thisBalance.sub(burnNum));
    }

    function revokePoker(uint256[5] memory pokers) lock public {
        uint revokeNum = 0;
        for (uint i=0; i<5; i++) {
            if (pokers[i] > 0) {
                transferFrom(msg.sender, address(1), pokers[i]);
                revokeNum = revokeNum + 1;
            }
        }
        IERC20(_xkeyAddr).transfer(msg.sender, _price.mul(revokeNum).mul(20).div(100));
    }

    function _getNextTokenId() private view returns (uint256) {
        return _currentTokenId.add(1);
    }

    function totalSupply() public view returns (uint256) {
        return _currentTokenId;
    }

    function maxCardNum() public view returns (uint256) {
        return _maxCardNum;
    }

    function _incrementTokenId() private {
        _currentTokenId++;
    }

    function baseTokenURI() public pure returns (string memory) {
        return "http://poker.xplanet.io/";
    }

    function tokenURI(uint256 _tokenId) external view returns (string memory) {
        return Strings.strConcat(baseTokenURI(), Strings.uint2str(_tokenId));
    }

}
