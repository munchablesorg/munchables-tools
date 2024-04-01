// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./interfaces/IDistribute.sol";
import "./interfaces/ILock.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Distribute is IDistribute, Ownable {
    address[] account_list;
    mapping(address => DistributeData) distribute_data;
    // when account data is populated, the total must match these exactly
    // or the contract will not progress to funding stage
    Totals public distribute_totals; // target
    Totals public populate_totals; // progress
    Totals public sent_totals; // sent
    DistributeStage public distribute_stage;
    address public depositor;
    address public distributor;

    address public USDB_CONTRACT;
    address public WETH_CONTRACT;
    address public LOCK_CONTRACT;

    modifier onlyPopulateStage() {
        require(distribute_stage == DistributeStage.POPULATE);
        _;
    }
    modifier onlyFundStage() {
        require(distribute_stage == DistributeStage.FUND);
        _;
    }
    modifier onlyDistributeStage() {
        require(distribute_stage == DistributeStage.DISTRIBUTE);
        _;
    }
    modifier onlyUnconfiguredStage() {
        require(distribute_stage == DistributeStage.UNCONFIGURED);
        _;
    }


    constructor(address _usdb_contract, address _weth_contract, uint256 _eth_total, uint256 _usdb_total, uint256 _weth_total, address _lock_contract)
            Ownable(msg.sender) onlyUnconfiguredStage {
        distribute_stage = DistributeStage.POPULATE;
        distribute_totals.eth = _eth_total;
        distribute_totals.usdb = _usdb_total;
        distribute_totals.weth = _weth_total;

        USDB_CONTRACT = _usdb_contract;
        WETH_CONTRACT = _weth_contract;

        LOCK_CONTRACT = _lock_contract;
    }

    function populate(address[] calldata _accounts, TokenType[] calldata _tokens, uint256[] calldata _quantities) external onlyPopulateStage onlyOwner {

        uint num_accounts = _accounts.length;
        require(_accounts.length == _tokens.length, "Array sizes must match");
        require(_tokens.length == _quantities.length, "Array sizes must match");
        for (uint16 i; i < num_accounts; i++) {
            address _account = _accounts[i];
            TokenType _token = _tokens[i];
            uint256 _quantity = _quantities[i];

            require(_token > TokenType.NONE && _token <= TokenType.WETH, "Invalid token type");
            require(_quantity > 0, "Invalid quantity");

            // check the old contract to verify
//            ILock.LockInfo memory lock_info = ILock(LOCK_CONTRACT).getLocked(_account);
//            require(lock_info.quantity == _quantity, "Quantity mismatch from Lock contract");

            if (distribute_data[_account].token_type == TokenType.NONE){
                if (_token == TokenType.ETH){
                    populate_totals.eth += _quantity;
                }
                else if (_token == TokenType.USDB){
                    populate_totals.usdb += _quantity;
                }
                else if (_token == TokenType.WETH){
                    populate_totals.weth += _quantity;
                }
                distribute_data[_account] = DistributeData(_token, _quantity, false);
                account_list.push(_account);

                emit Populated(_account, _token, _quantity);
            }
        }
    }

    function seal() external onlyPopulateStage onlyOwner {
        require(distribute_totals.eth == populate_totals.eth, "ETH populate totals do not match target");
        require(distribute_totals.usdb == populate_totals.usdb, "USDB populate totals do not match target");
        require(distribute_totals.weth == populate_totals.weth, "WETH populate totals do not match target");

        distribute_stage = DistributeStage.FUND;
        renounceOwnership();

        emit Sealed();
    }

    function fund(address _distributor) external payable onlyFundStage {
        require(msg.value > 0 && msg.value == populate_totals.eth, "ETH total incorrect");
        // ETH is here, now transfer the ERC-20s
        IERC20 usdb_contract = IERC20(USDB_CONTRACT);
        IERC20 weth_contract = IERC20(WETH_CONTRACT);

        usdb_contract.transferFrom(msg.sender, address(this), populate_totals.usdb);
        weth_contract.transferFrom(msg.sender, address(this), populate_totals.weth);

        distribute_stage = DistributeStage.DISTRIBUTE;

        depositor = msg.sender;
        distributor = _distributor;

        emit Funded(depositor, distributor);
    }

    function distribute(uint256 _start, uint256 _count) external onlyDistributeStage {
        require(msg.sender == distributor, "Only distributor can call distribute()");

        uint256 count = _count;
        IERC20 usdb_contract = IERC20(USDB_CONTRACT);
        IERC20 weth_contract = IERC20(WETH_CONTRACT);

        if (account_list.length < _start + count - 1){
            count = account_list.length - _start;
        }

        while (count > 0){
            address payable account = payable(account_list[_start + count - 1]);
            DistributeData memory data = distribute_data[account];
            if (!data.distributed){
                // send tokens
                if (data.token_type == TokenType.ETH){
                    account.transfer(data.quantity);
                    sent_totals.eth += data.quantity;
                }
                else if (data.token_type == TokenType.USDB){
                    usdb_contract.transfer(account, data.quantity);
                    sent_totals.usdb += data.quantity;
                }
                else if (data.token_type == TokenType.WETH){
                    weth_contract.transfer(account, data.quantity);
                    sent_totals.weth += data.quantity;
                }

                distribute_data[account].distributed = true;
                emit Distributed(account, data.token_type, data.quantity);
            }
            count--;
        }
    }

    function rescue() external onlyDistributeStage {
        require(depositor != address(0), "Deposit not sent yet");
        require(msg.sender == depositor, "Only depositor can rescue");

        IERC20 usdb_contract = IERC20(USDB_CONTRACT);
        IERC20 weth_contract = IERC20(WETH_CONTRACT);

        uint256 eth_balance = address(this).balance;
        uint256 usdb_balance = usdb_contract.balanceOf(address(this));
        uint256 weth_balance = weth_contract.balanceOf(address(this));

        if (eth_balance > 0){
            payable(depositor).transfer(eth_balance);
        }
        if (usdb_balance > 0){
            usdb_contract.transfer(depositor, usdb_balance);
        }
        if (weth_balance > 0){
            weth_contract.transfer(depositor, weth_balance);
        }

        distribute_stage = DistributeStage.REFUNDED;
    }

    /////////////////////////////////////////
    // views
    /////////////////////////////////////////

    function getDistributeData(address _account) external view
            returns (DistributeData memory _distribute_data) {
        _distribute_data = distribute_data[_account];
    }

    function getAccountList(uint256 _start_index) external view returns (address[50] memory _accounts) {
        require(account_list.length > _start_index, "Invalid start index");

        address[50] memory ret_accounts;
        for (uint i; i < 50; i++){
            if (account_list.length > _start_index + i){
                ret_accounts[i] = account_list[_start_index + i];
            }
            else {
                break;
            }
        }
        _accounts = ret_accounts;
    }
}
