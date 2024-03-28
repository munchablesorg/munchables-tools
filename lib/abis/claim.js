
const period_metadata_abi = 'tuple(uint16 current_id, ' +
    '        uint256 current_period_time, ' +
    '        uint256 next_period_time, ' +
    '        uint256 available_tokens, ' +
    '        uint256 claimed_tokens)';

export const claim_abi_json = [
    `function distribute()`,
    `function claim()`,
    `function getCurrentPeriod() view returns (${period_metadata_abi} _metadata)`,
    `event Distributed(${period_metadata_abi} _metadata)`,
    `event Claimed(address indexed _account, uint256 _claimed, address indexed _referrer, uint256 _referrer_bonus)`,
    `event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`
];