
export const distribute_abi_json = [
    `function populate(address[] _accounts, uint8[] _tokens, uint256[] _quantities)`,
    `function getDistributeData(address account) view returns (tuple(uint8 _token_type, uint256 _quantity, bool _distributed) return_data)`,
    `function getAccountList(uint256 _start_index) external view returns (address[50] memory _accounts)`
];