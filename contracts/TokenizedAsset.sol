// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract TokenizedAsset is ERC1155 {
    struct Asset {
        string symbol;
        uint8 decimals;
        uint256 supply;
    }

    // Mapping from token ID to asset details.
    mapping(uint256 => Asset) public assets;
    // Mapping from asset symbol to token ID.
    mapping(string => uint256) public symbolToTokenId;
    uint256 public nextTokenId;

    event AssetAdded(uint256 indexed tokenId, string symbol);

    constructor(string memory uri_) ERC1155(uri_) {}

    /**
     * @notice Adds a new asset.
     * @param symbol The asset's symbol (e.g. "AAPL", "ETF1", "GOLD").
     * @param decimals The number of decimals for the asset.
     * @param initialSupply The initial token supply for the asset.
     */
    function addAsset(
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) external {
        uint256 tokenId = nextTokenId++;
        assets[tokenId] = Asset(symbol, decimals, initialSupply);
        symbolToTokenId[symbol] = tokenId;
        if (initialSupply > 0) {
            _mint(msg.sender, tokenId, initialSupply, "");
        }
        emit AssetAdded(tokenId, symbol);
    }

    /**
     * @notice Mints tokens for a given asset.
     * @param to The recipient address.
     * @param tokenId The token ID for the asset.
     * @param amount The number of tokens to mint.
     * @param data Additional data (if any).
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external {
        assets[tokenId].supply += amount;
        _mint(to, tokenId, amount, data);
    }

    /**
     * @notice Burns tokens for a given asset.
     * @param account The address whose tokens are being burned.
     * @param tokenId The token ID for the asset.
     * @param amount The number of tokens to burn.
     */
    function burn(
        address account,
        uint256 tokenId,
        uint256 amount
    ) external {
        assets[tokenId].supply -= amount;
        _burn(account, tokenId, amount);
    }
}
