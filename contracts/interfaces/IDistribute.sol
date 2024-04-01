// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IDistribute {

    enum TokenType {
        NONE,
        ETH,
        USDB,
        WETH
    }

    enum DistributeStage {
        UNCONFIGURED,  // Should never be here
        POPULATE, // waiting for distribute data to be loaded
        FUND, // data has been loaded, totals match.  funds can now be sent
        DISTRIBUTE, // funds received and waiting to be distributed
        REFUNDED // funds were refunded
    }

    struct Totals {
        uint256 eth;
        uint256 usdb;
        uint256 weth;
    }

    struct DistributeData {
        TokenType token_type;
        uint256   quantity;
        bool      distributed;
    }

    function populate(address[] memory _accounts, TokenType[] memory _tokens, uint256[] memory _quantities) external;
    function seal() external;
    function fund(address _distributor) external payable;
    function distribute(uint256 _start, uint256 _count) external;
    function rescue() external;

    function getDistributeData(address account) external view returns (DistributeData memory return_data);
    function getAccountList(uint256 _start_index) external view returns (address[50] memory _accounts);

    event Populated(address account, TokenType token, uint256 quantity);
    event Sealed();
    event Funded(address depositor, address distributor);
    event Distributed(address indexed account, TokenType token_type, uint256 quantity);
}