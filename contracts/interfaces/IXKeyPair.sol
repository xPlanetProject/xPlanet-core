pragma solidity >=0.5.0;

interface IXKeyPair {

    function totalSupply() external view returns (uint);
    function balanceOf(uint256 tokenId) external view returns (uint);

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);

    function mint(uint256 tokenId) external returns (uint liquidity);
    function burn(address to,uint256 tokenId)  external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function TransferBurnAmount(address msg_sender,uint256 tokenId,uint256 liquidity) external;
    function skim(address to) external;
    function sync() external;
    function nft()external returns(address);
    function initialize(address, address,address,address) external;
}
