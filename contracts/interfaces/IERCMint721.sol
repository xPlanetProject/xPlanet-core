pragma solidity >=0.5.0;
interface IERCMint721 {
    function mintGold(address _to) external;
    function mintSilver(address _to) external;
    function mintCopper(address _to) external;
    function ifMintEnd() external view returns (bool);
}
