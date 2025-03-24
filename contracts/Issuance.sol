// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

interface IEquityToken {
    function mint(address, uint256) external;
}

contract Issuer is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;
    using Strings for uint256;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;

    struct MintRequest {
        address token;
        address issuer;
        uint256 amount;
    }

    mapping(bytes32 => MintRequest) public requests;

    event MintRequested(
        bytes32 indexed requestId,
        address indexed issuer,
        string symbol,
        uint256 amount
    );

    event MintRequestFulfilled(
        bytes32 indexed requestId,
        uint256 verifiedHoldings,
        bool minted
    );

    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId
    ) FunctionsClient(router) {
        donId = _donId;
        subscriptionId = _subscriptionId;
    }

    function requestMint(
        address token,
        string calldata symbol,
        uint256 qty,
        string calldata source,
        uint64 secretVersion,
        uint8 secretSlot
    ) external returns (bytes32 requestId) {
        // Prepare Chainlink Functions request for redemption.
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        req.addDONHostedSecrets(secretSlot, secretVersion);

        string[] memory args = new string[](3);
        args[0] = symbol;
        args[1] = qty.toString();

        req.setArgs(args);

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        requests[requestId] = MintRequest(token, msg.sender, qty);
        emit MintRequested(requestId, msg.sender, symbol, qty);
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory
    ) internal override {
        uint256 verifiedHoldings = abi.decode(response, (uint256));
        MintRequest memory req = requests[requestId];

        bool minted = false;

        if (verifiedHoldings >= req.amount) {
            IEquityToken(req.token).mint(req.issuer, req.amount);
            minted = true;
        }

        emit MintRequestFulfilled(requestId, verifiedHoldings, minted);
    }
}
