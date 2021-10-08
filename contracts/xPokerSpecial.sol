pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Strings.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IERCMint721.sol";

contract xPokerSpecial is ERC721Full, Ownable, IERCMint721 {
    using Strings for string;
    uint256 private _currentGoldId = 0;
    uint256 private _currentSilverId = 100000;
    uint256 private _currentCopperId = 200000;
    uint public maxCardNum = 2000;
    address public minter;

    modifier onlyMinter {
        require(msg.sender == minter,"not minter");
        _;
    }

    constructor(
        address _minter
    ) public ERC721Full("XPOKERSPECIAL", "XPS") {
        minter = _minter;
    }

    function setTotalCards(uint _count) public onlyOwner {
        require(_count>maxCardNum, "Not premitted to set smaller count.");
        maxCardNum = _count;
    }

    function setMinter(address _minter) public onlyOwner {
        minter = _minter;
    }

    function mintGold(address _to) onlyMinter public {
        require(totalSupply().add(1)<=maxCardNum, "No more poker.");
        uint256 newTokenId = _currentGoldId.add(1);
        _mint(_to, newTokenId);
        _currentGoldId++;
    }

    function mintSilver(address _to) onlyMinter public {
        require(totalSupply().add(1)<=maxCardNum, "No more poker.");
        uint256 newTokenId = _currentSilverId.add(1);
        _mint(_to, newTokenId);
        _currentSilverId++;
    }

    function mintCopper(address _to) onlyMinter public {
        require(totalSupply().add(1)<=maxCardNum, "No more poker.");
        uint256 newTokenId = _currentCopperId.add(1);
        _mint(_to, newTokenId);
        _currentCopperId++;
    }

    function baseTokenURI() public pure returns (string memory) {
        return "http://specialpoker.xplanet.io/";
    }

    function tokenURI(uint256 _tokenId) external view returns (string memory) {
        return Strings.strConcat(baseTokenURI(), Strings.uint2str(_tokenId));
    }

    function ifMintEnd() external view returns (bool){
        if (totalSupply() >= maxCardNum) {
            return true;
        }
        return false;
    }

}

