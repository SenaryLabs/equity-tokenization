// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./TokenizedAsset.sol";

contract OrderManager is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;
    using Strings for uint256;

    uint256 private _orderCounter; // Unique order IDs

    enum MintOrRedeem {
        Mint,
        Redeem
    }
    struct RequestData {
        uint256 tokenId;
        string orderId;
        uint256 quantity;
        uint256 lockedCollateral;
        address requester;
        MintOrRedeem mintOrRedeem;
    }
    mapping(bytes32 => RequestData) private s_requestIdToRequest;
    uint32 private constant GAS_LIMIT = 300_000;

    address private immutable i_collateralToken;
    address private s_functionsRouter;
    bytes32 private s_donID;
    uint64 private immutable i_subId;

    string private s_mintSource;
    string private s_redeemSource;
    uint64 private s_secretVersion;
    uint8 private s_secretSlot;

    // Reference to the token contract that holds asset logic.
    TokenizedAsset public tokenizedAsset;

    event MintRequestInitiated(
        uint256 indexed tokenId,
        address indexed requester,
        uint256 quantity,
        uint256 collateralRequired
    );
    event RedeemRequestInitiated(
        uint256 indexed tokenId,
        address indexed requester,
        uint256 quantity
    );
    event RequestFulfilled(
        bytes32 requestId,
        string orderId,
        uint256 quantity,
        MintOrRedeem mintOrRedeem
    );
    event RequestError(
        bytes32 requestId,
        string lastError,
        string lastResponse
    );
    event Debug(string message, uint256 value);
    event DebugFilledPrice(
        string message,
        string orderId,
        uint256 filledAvgPrice
    );

    error OrderManager__NotEnoughCollateral();

    constructor(
        address functionsRouter,
        bytes32 donID,
        uint64 subId,
        address collateralToken,
        address tokenizedAssetAddress,
        uint64 secretVersion,
        uint8 secretSlot
    ) FunctionsClient(functionsRouter) ConfirmedOwner(msg.sender) {
        s_functionsRouter = functionsRouter;
        s_donID = donID;
        i_subId = subId;
        i_collateralToken = collateralToken;
        tokenizedAsset = TokenizedAsset(tokenizedAssetAddress);
        s_secretVersion = secretVersion;
        s_secretSlot = secretSlot;
    }

    /**
     * @notice Calculates the required collateral.
     */
    function calculateUSDAmount(
        uint256 price,
        uint256 quantity,
        uint8 decimals
    ) public pure returns (uint256) {
        uint256 intermediate = price * quantity;
        uint256 normalized = intermediate / (10 ** decimals);
        return normalized;
    }

    /**
     * @notice Sends a mint order request using Chainlink Functions.
     * @param symbol The asset symbol (must be registered in TokenizedAsset).
     * @param quantity The quantity to mint.
     * @param price The price used to calculate collateral.
     * @param mintSource The inline JavaScript source for Chainlink Functions.
     * @param orderIdPrefix A prefix to generate a unique order ID.
     */
    function sendOrderRequest(
        string memory symbol,
        uint256 quantity,
        uint256 price,
        string memory mintSource,
        string memory orderIdPrefix
    ) external returns (bytes32 requestId) {
        uint256 tokenId = tokenizedAsset.symbolToTokenId(symbol);
        // Ensure the asset exists.
        (string memory assetSymbol, uint8 assetDecimals, ) = tokenizedAsset
            .assets(tokenId);
        require(bytes(assetSymbol).length > 0, "Asset not found");

        uint256 collateralRequired = calculateUSDAmount(
            price,
            quantity,
            assetDecimals
        );

        // Check if the user provided enough collateral.
        if (
            ERC20(i_collateralToken).allowance(msg.sender, address(this)) <
            collateralRequired
        ) {
            revert OrderManager__NotEnoughCollateral();
        }
        ERC20(i_collateralToken).transferFrom(
            msg.sender,
            address(this),
            collateralRequired
        );

        // Prepare Chainlink Functions request.
        s_mintSource = mintSource;
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(s_mintSource);
        req.addDONHostedSecrets(s_secretSlot, s_secretVersion);

        _orderCounter += 1;
        string memory clientOrderId = string(
            abi.encodePacked(orderIdPrefix, "-", _orderCounter.toString())
        );

        string[] memory args = new string[](3);
        args[0] = symbol;
        args[1] = quantity.toString();
        args[2] = clientOrderId;
        req.setArgs(args);

        requestId = _sendRequest(req.encodeCBOR(), i_subId, GAS_LIMIT, s_donID);
        s_requestIdToRequest[requestId] = RequestData(
            tokenId,
            clientOrderId,
            quantity,
            collateralRequired,
            msg.sender,
            MintOrRedeem.Mint
        );

        emit MintRequestInitiated(
            tokenId,
            msg.sender,
            quantity,
            collateralRequired
        );
    }

    /**
     * @notice Sends a redeem (sell) order request using Chainlink Functions.
     * In a redeem order, the user intends to sell an asset. The corresponding ERC1155 tokens
     * will be burned, and the user will receive USDC (or another collateral) in return.
     *
     * @param symbol The asset symbol (must be registered in TokenizedAsset).
     * @param quantity The quantity to redeem (sell).
     * @param price The price used to calculate the USDC value.
     * @param redeemSource The inline JavaScript source for Chainlink Functions.
     * @param orderIdPrefix A prefix to generate a unique order ID.
     */
    function sendRedeemRequest(
        string memory symbol,
        uint256 quantity,
        uint256 price,
        string memory redeemSource,
        string memory orderIdPrefix
    ) external returns (bytes32 requestId) {
        uint256 tokenId = tokenizedAsset.symbolToTokenId(symbol);
        // Ensure the asset exists.
        (string memory assetSymbol, uint8 assetDecimals, ) = tokenizedAsset
            .assets(tokenId);
        require(bytes(assetSymbol).length > 0, "Asset not found");

        // Optionally, check that the user holds enough ERC1155 tokens to redeem.
        require(
            tokenizedAsset.balanceOf(msg.sender, tokenId) >= quantity,
            "Insufficient token balance for redeem"
        );

        // Prepare Chainlink Functions request for redemption.
        s_redeemSource = redeemSource;
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(s_redeemSource);
        req.addDONHostedSecrets(s_secretSlot, s_secretVersion);

        _orderCounter += 1;
        string memory clientOrderId = string(
            abi.encodePacked(orderIdPrefix, "-", _orderCounter.toString())
        );

        string[] memory args = new string[](3);
        args[0] = symbol;
        args[1] = quantity.toString();
        args[2] = clientOrderId;
        req.setArgs(args);

        requestId = _sendRequest(req.encodeCBOR(), i_subId, GAS_LIMIT, s_donID);
        s_requestIdToRequest[requestId] = RequestData(
            tokenId,
            clientOrderId,
            quantity,
            0,
            msg.sender,
            MintOrRedeem.Redeem
        );

        emit RedeemRequestInitiated(tokenId, msg.sender, quantity);
    }

    /**
     * @notice Callback for Chainlink Functions fulfillment.
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        emit Debug("fulfillRequest reached", _orderCounter);

        if (err.length > 0) {
            emit RequestError(requestId, string(err), string(response));
            return;
        }

        RequestData memory request = s_requestIdToRequest[requestId];

        (, uint8 assetDecimals, ) = tokenizedAsset.assets(request.tokenId);

        uint256 filledAvgPrice = abi.decode(response, (uint256)); // Decode the filled average price from the response.
        emit DebugFilledPrice(
            "Filled Avg Price",
            request.orderId,
            filledAvgPrice
        );

        uint256 mintedOrBurnedUnits = request.quantity; // True 1:1 mapping: use the raw quantity.

        if (request.mintOrRedeem == MintOrRedeem.Mint) {
            uint256 actualCost = calculateUSDAmount(
                filledAvgPrice,
                request.quantity,
                assetDecimals
            );
            uint256 residual = request.lockedCollateral > actualCost
                ? request.lockedCollateral - actualCost
                : 0;

            if (residual > 0) {
                ERC20(i_collateralToken).transfer(request.requester, residual);
            }
            // Mint the exact amount requested.
            tokenizedAsset.mint(
                request.requester,
                request.tokenId,
                mintedOrBurnedUnits,
                ""
            );
        } else {
            // Burn the exact amount requested.
            tokenizedAsset.burn(
                request.requester,
                request.tokenId,
                mintedOrBurnedUnits
            );

            uint256 usdcValue = calculateUSDAmount(
                filledAvgPrice,
                request.quantity,
                assetDecimals
            );
            if (usdcValue > 0) {
                ERC20(i_collateralToken).transfer(request.requester, usdcValue);
            }
            emit Debug("Redeem", mintedOrBurnedUnits);
        }

        delete s_requestIdToRequest[requestId];

        emit RequestFulfilled(
            requestId,
            request.orderId,
            mintedOrBurnedUnits,
            request.mintOrRedeem
        );
    }

    /**
     * @notice Refunds any collateral or token balance held by this contract.
     */
    function refund(address token) external onlyOwner {
        uint256 balance = ERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to refund");
        require(ERC20(token).transfer(owner(), balance), "Transfer failed");
    }
}
