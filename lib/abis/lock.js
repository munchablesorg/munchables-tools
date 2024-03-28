
const locked_token_abi = `tuple(address token_contract, uint256 quantity)`;
const lock_info_abi = `tuple(${locked_token_abi}[] locked_tokens, uint256 unlock_time, uint256 lock_duration, uint256 lock_remainder)`;

export const lock_abi_json = [
    `event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`,
    `event Locked(address indexed _account, address indexed _token_contract, uint256 _quantity, uint256 _lock_duration, uint256 _unlock_time, uint256 _lock_remainder, uint256 _nft_drop_cost, uint256 _nft_drop)`,
    `function getLocked(address _account) view returns (${lock_info_abi} _lock_data)`,
    `function lock(address _token_contract, uint256 _quantity, uint256 _lock_duration)`
];