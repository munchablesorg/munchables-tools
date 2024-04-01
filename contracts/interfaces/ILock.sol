// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface ILock {
    /// @notice AllowedToken : Structure of allowed tokens
    /// @param token_contract : Address of the token contract
    /// @param precision : Precision of the token, aka decimal
    /// @param usd_value : Value of the token in USD
    /// @param yield_rate : Yield of the token in percent, multiplied by 100
    /// @param nft_drop_cost : Cost of the NFT drop
    /// @param yield_contract : Address of the yield contract
    /// @param active : True if the token is active
    struct AllowedToken {
        address token_contract;
        uint256 precision;
        uint256 usd_value;
        uint256 yield_rate;
        uint256 nft_drop_cost;
        address yield_contract;
        bool active;
    }

    /// @notice LockInfo : Structure of lock information of an account
    /// @param token_contract : Address of the token contract
    /// @param quantity : Quantity of the token
    /// @param unlock_time : Time when the user can unlock their tokens
    /// @param lock_duration : The amount of time the user wants to lock tokens for
    /// @param lock_remainder : Store the remainder of locked_tokens / nft_cost here and add it to future locks
    struct LockInfo {
        address token_contract;
        uint256 quantity;
        uint256 lock_duration;
        uint256 unlock_time;
        uint256 lock_remainder;
    }

    /// @notice yieldClaim : Claim the yield, called by claim contract
    function yieldClaim() external;

    /// @notice getLocked : Returns the amount of locked tokens, the account lock time and account unlock_time
    /// @param _account : Address of the account
    /// @return _lock_info : LockInfo
    function getLocked(
        address _account
    ) external view returns (LockInfo memory _lock_info);

    /// @notice getLockedWeightedValue : Returns a dollar value of locked tokens for an account, each locked asset, weighted by yield value of that asset
    /// @param _account : Address of the account
    /// @return _locked_weighted_value : Locked weighted value
    function getLockedWeightedValue(
        address _account
    ) external view returns (uint256 _locked_weighted_value);

    /// @notice getLockDrop : Returns lockdrop_start and lockdrop_end
    /// @return _lockdrop_start : Start time of the lockdrop
    /// @return _lockdrop_end : End time of the lockdrop
    function getLockdrop()
        external
        view
        returns (uint256 _lockdrop_start, uint256 _lockdrop_end);

    /// @notice getAllowedTokens : Returns the array of allowed tokens
    /// @return _allowed_tokens : Array of allowed tokens
    function getAllowedTokens()
        external
        view
        returns (AllowedToken[] memory _allowed_tokens);

    event ContractConfigured(
        address _account_manager_contract,
        address _claim_contract,
        address _pair_contract,
        address _proxy_contract
    );
    event Locked(
        address indexed _account,
        address indexed _token_contract,
        uint256 _quantity,
        uint256 _lock_duration,
        uint256 _unlock_time,
        uint256 _lock_remainder,
        uint256 _nft_drop_cost,
        uint256 _nft_drop
    );
    event LockTime(
        address indexed _account,
        uint256 _lock_duration,
        uint256 _unlock_time
    );
    event Relocked(
        address indexed _account,
        uint256 _lock_duration,
        uint256 _unlock_time
    );
    event Unlocked(
        address indexed _account,
        address indexed _token_contract,
        uint256 _quantity
    );
    event LockDrop(uint256 _lockdrop_start, uint256 _lockdrop_end);
    event AllowedTokenAdded(
        address indexed _token_contract,
        uint256 _precision,
        uint256 _yield_rate,
        uint256 _nft_drop_cost,
        address _yield_contract
    );
    event TokenConfigured(
        address indexed _token_contract,
        uint256 _yield_rate,
        uint256 _nft_drop_cost
    );
    event TokenDeactivated(address indexed _token_contract, bool _active);
    event TokenActivated(address indexed _token_contract, bool _active);
    event ValueUpdated(address indexed _token_contract, uint256 _usd_value);
    event YieldClaimed(
        uint256 _eth_yield,
        uint256 _gas_yield,
        uint256 _usdb_yield,
        uint256 _weth_yield
    );
    event SetProxyAddress(address _proxy_address);
    event WriteDataFeed(
        uint256 _eth_usd_value,
        uint256 _eth_nft_drop_cost,
        uint256 _usdb_usd_value,
        uint256 _usdb_nft_drop_cost,
        uint256 _weth_usd_value,
        uint256 _weth_nft_drop_cost
    );
}
