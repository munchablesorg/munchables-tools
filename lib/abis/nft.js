export const nft_abi_json = [
  `event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)`,
  "function safeMint(address to, string memory uri)",
  "function tokenURI(uint256 _token_uri) view returns (string uri)",
  "function setURI(uint256 _tokenId, string _tokenURI)",
  "function revealNFT(address _account, string memory _tokenURI, bytes32 _tx_hash, " +
                      "bytes _signature, uint8 _realm, uint8 _rarity, uint16 _species)",
  "function totalSupply() view returns (uint256 _total)",
  "function fetchTokens(address _account) public view returns (uint256[] _tokens, string[] _uris)",
  "function minted(address _account, bytes32 _tx_id) public view returns (bool _is_minted)",
  "function getOwner(uint256 _account) public view returns (address _owner)"
];
