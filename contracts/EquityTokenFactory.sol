// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./EquityToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EquityTokenFactory is Ownable {
    address public immutable implementation;
    mapping(string => address) public tokens;

    event EquityTokenCreated(
        address indexed tokenAddress,
        string indexed name,
        string indexed symbol,
        address issuer,
        address custodian,
        address issuanceRequest,
        uint256 tokensPerShare
    );

    constructor(address _implementation, address owner) Ownable(owner) {
        implementation = _implementation;
    }

    function createEquityToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 tokensPerShare,
        address issuer,
        address custodian,
        address issuanceRequest
    ) external onlyOwner returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(symbol));
        address clone = Clones.cloneDeterministic(implementation, salt);

        EquityToken(clone).initialize(
            name,
            symbol,
            decimals,
            tokensPerShare,
            issuer,
            custodian,
            issuanceRequest
        );

        tokens[symbol] = clone;

        emit EquityTokenCreated(
            clone,
            name,
            symbol,
            issuer,
            custodian,
            issuanceRequest,
            tokensPerShare
        );

        return clone;
    }
}
