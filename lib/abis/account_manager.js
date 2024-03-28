const nft_attributes_abi =
  "tuple(uint256 xp, uint8 rarity, int256 level, uint16 species, uint8 realm, uint256 last_petted_time" +
    ", uint16 strength" +
    ", uint16 agility" +
    ", uint16 stamina" +
    ", uint16 defence" +
    ", uint16 voracity" +
    ", uint16 cuteness" +
    ", uint16 charisma" +
    ", uint16 trustworthiness" +
    ", uint16 leadership" +
    ", uint16 empathy" +
    ", uint16 intelligence" +
    ", uint16 cunning" +
    ", uint16 creativity" +
    ", uint16 adaptability" +
    ", uint16 wisdom)"
const slot_abi = `tuple(uint256 token_id, uint256 date_imported, ${nft_attributes_abi} attributes, bool occupied)`;
const account_data_abi = `tuple(uint256 registration_date, ${slot_abi}[] slots, uint8 max_slots, uint256 unrevealed_nfts, bool primordial_allocated, uint256 unallocated_xp, uint256 last_xp_claim_time, uint256 slots_total_xp, uint256 slots_total_xp_snapshot, uint16 last_fed_period_id, uint8 snuggery_plane, address referrer, uint256 last_pet_time, address sub_account)`;
const locked_token_abi = `tuple(address token_contract, uint256 quantity)`;
const period_metadata_abi = `tuple(uint16 current_id, uint256 current_period_time, uint256 next_period_time, uint256 available_tokens, uint256 claimed_tokens)`;
const dashboard_abi = `tuple(${account_data_abi} account_data, ${locked_token_abi}[] locked_tokens, uint256 total_xp, uint256 total_xp_snapshot, uint256 xp_per_day, uint256 xp_bonus_percent, uint256 xp_claimable, uint256 points_claimable, uint256 points_share, ${period_metadata_abi} period, uint16 last_claim_period_id, bool primordial_claimable, bool use_points, uint256 points)`;

export const account_manager_abi_json = [
  "event Revealed(address indexed _account, uint256 _unrevealed_nfts, uint8 _minting_queue)",
  "event ImportedToSnuggery(address indexed _account, uint256 indexed _token_id, uint8 _slot_id)",
  `event ExportedFromSnuggery(address indexed _account, uint256 indexed _token_id, uint8 _slot_id, ${nft_attributes_abi} _nft_attributes)`,
  `event LevelUpgraded(address indexed _account, uint256 indexed _token_id, uint8 _slot_id, ${nft_attributes_abi} _nft_attributes, int256 _original_level, int256 _current_level, uint256 _current_level_threshold, int256 _next_level, uint256 _next_level_threshold)`,
  `event Registered(address indexed _account, uint8 _snuggery_realm, address indexed _referrer)`,
  `event ImportedMetadata(bool _is_upgrade, bytes32 _tx_hash, address indexed _account, uint256 indexed _token_id, uint8 _slot_id, ${nft_attributes_abi} _attributes)`,
  `event Fed(address indexed _account, uint256 indexed _token_id, uint8 _slot_id, uint256 _xp_original, uint256 _rarity_bonus, int256 _realm_bonus, uint256 _xp_boosted)`,
  `event Claimed(address indexed _account, uint256 _amount_claimed)`,
  `event UpdatedSlotXPandSnapshot(address indexed _account, uint16 _last_fed_period_id, uint16 _current_period_id, uint256 _slot_total_xp, uint256 _slot_total_xp_snapshot, uint256 _total_xp, uint256 _total_xp_snapshot)`,
  `event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`,
  `function importMetadata(bool _is_upgrade, bytes32 _tx_hash, address _account, uint256 _token_id, uint8 _slot_id, ${nft_attributes_abi} _nft_attributes)`,
  `function getAccountData(address _account) view returns (${account_data_abi} _account_data)`,
  `function getUserDashboard(address _account) view returns (${dashboard_abi} _dashboard)`,
  `function reveal()`,
  `function claim()`,
  `function feed(uint8 _slot_id, uint256 _xp)`
];
