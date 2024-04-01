
export const distribute_abi_json = [
    `function populate(address[] _accounts, uint8[] _tokens, uint256[] _quantities)`,
    `function getDistributeData(address account) view returns (tuple(uint8 _token_type, uint256 _quantity, bool _distributed) return_data)`,
    `function getAccountList(uint256 _start_index) external view returns (address[50] memory _accounts)`,
    `function seal() external`,
    `function fund(address _distributor) external payable`,
    `function distribute(uint256 _start, uint256 _count) external`,
    `function distribute_totals() public view returns (uint256[3])`,
    `function populate_totals() public view returns (uint256[3])`,
    `function sent_totals() public view returns (uint256[3])`,
    `function owner() public view returns (address)`,
    `function distribute_stage() public view returns (uint8)`,
];
