// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/community-contracts/contracts/token/ERC20/extensions/ERC20Custodian.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EquityToken is ERC20Permit, ERC20Pausable, ERC20Custodian, AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 private _decimals;
    uint256 public tokensPerShare;

    string private _name;
    string private _symbol;

    bool private _initialized;

    event CustodianTransferred(address indexed custodian, address indexed from, address indexed to, uint256 amount);
    event Initialized(
        string name,
        string symbol,
        uint8 decimals,
        uint256 tokensPerShare,
        address issuer,
        address custodian,
        address issuanceRequest
    );

    constructor() ERC20("Implementation", "IMPL") ERC20Permit("Implementation") {
        _initialized = true; // prevent initialization of implementation contract
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 tokensPerShare_, // scaled by 1e6 (e.g., 1e6 = 1 token per share)
        address issuer,
        address custodian,
        address issuanceRequest // contract responsible for verifying and minting
    ) external {
        require(!_initialized, "Already initialized");
        _initialized = true;

        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        tokensPerShare = tokensPerShare_;

        _grantRole(DEFAULT_ADMIN_ROLE, issuer);
        _grantRole(ISSUER_ROLE, issuer);
        _grantRole(CUSTODIAN_ROLE, custodian);
        _grantRole(MINTER_ROLE, issuanceRequest);

        emit Initialized(name_, symbol_, decimals_, tokensPerShare_, issuer, custodian, issuanceRequest);
    }

    // Overrides for ERC20 metadata
    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // Mint controlled strictly by MINTER_ROLE (issuance request after verification)
    function mintShares(address to, uint256 verifiedShares) external onlyRole(MINTER_ROLE) {
        uint256 mintAmount = (verifiedShares * tokensPerShare) / 1e6;
        _mint(to, mintAmount);
    }

    // Custodian's forced transfer
    function custodianTransfer(address from, address to, uint256 amount) external onlyRole(CUSTODIAN_ROLE) {
        _transfer(from, to, amount);
        emit CustodianTransferred(msg.sender, from, to, amount);
    }

    // Emergency pause/unpause controlled by admin (issuer)
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ERC20Custodian required implementation
    function _isCustodian(address user) internal view override returns (bool) {
        return hasRole(CUSTODIAN_ROLE, user);
    }

    // Overridden _update to integrate Pausable and Custodian logic
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Pausable, ERC20Custodian)
    {
        super._update(from, to, value);
    }
}
