import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'

const CHALLENGE_SUFFIX = '/dapp-auth/challenge';
const SOLVE_SUFFIX = '/dapp-auth/solve';
const CONTRACTS_SUFFIX = '/contracts';
const BALANCE_SUFFIX = '/points-balances';
const BATCHES_SUFFIX = '/batches';


export class BlastPointsAPI {
  #wallet;
  #bearerToken
  #dataChallenge;
  #message;
  #batchIds;
  #fileName

  contractAddress;
  operatorAddress;
  isTest;
  distributionList;
  batchSize;  prefix;
  

  constructor(prefix, privateKey, contractAddress, operatorAddress, isTest = true, batchSize = 20, fileName = 'cache/blast_batch_ids.json') {
    if (prefix === undefined || contractAddress === undefined || operatorAddress === undefined) {
      throw new Error('prefix, contractAddress, and operatorAddress are required');
    }
    if (!privateKey || privateKey.length !== 66 || !privateKey.startsWith('0x')) {
        throw new Error('Invalid #key provided.');
    }
    this.prefix = prefix;
    this.contractAddress = contractAddress;
    this.operatorAddress = operatorAddress;
    this.isTest = isTest;
    this.distributionList = []
    this.batchSize = batchSize;

    this.#wallet = new ethers.Wallet(privateKey);
    this.#dataChallenge = undefined;
    this.#message = undefined;
    this.#bearerToken = undefined;
    this.#batchIds = [];
    this.#fileName = fileName;
  }
  
  // Auth 
  async obtainBearerToken() {
    if (this.#bearerToken !== undefined) {
      throw new Error('Bearer token already obtained');
    }
    if (this.#dataChallenge === undefined || this.#message === undefined) {
      await this.#obtainChallenge();
    }
    
    const signature = await this.#signMessage(this.#dataChallenge);

    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: `{"challengeData":"${this.#dataChallenge}","signature":"${signature}"}`
    };

    try {
      const response = await axios(this.prefix+SOLVE_SUFFIX, options);
      const data = response.data;
      if (data.success) {
        this.#dataChallenge = undefined
        this.#message = undefined
        this.#bearerToken = data.bearerToken
      } else {
        throw new Error(`Failed to obtain bearer token: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to obtain bearer token: ${error}`);  
    }
  }
  
  async #obtainChallenge() {
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: `{"contractAddress":"${this.contractAddress}","operatorAddress":"${this.operatorAddress}"}`
    };

    try {
      const response = await axios(this.prefix+CHALLENGE_SUFFIX, options);
      const data = response.data;
      if (data.success) {
        this.#dataChallenge = data.challengeData
        this.#message = data.message
      } else {
        throw new Error(`Failed to obtain challenge: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to obtain challenge: ${error}`);  
    }
  }


  // Puts
  async submitBatch(pointType, transfers) {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }
    
    if (!this.#validateBatchInputs(pointType, transfers)) {
      throw new Error('Invalid batch inputs');
    }
    const batchId = uuidv4();

    const body = {
      pointType: pointType,
      transfers: transfers
    }

    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.#bearerHeader()
      },
      body: JSON.stringify(body)    
    };
    

    try {
      const response = await axios(this.prefix+CONTRACTS_SUFFIX+this.contractAddress+BATCHES_SUFFIX+batchId, options);
      const data = response.data;
      if (data.success) {
        this.#batchIds.push(data.batchId);
      } else {
        throw new Error(`Failed to submit batch: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to submit batch: ${error}`);  
    }
    this.#saveBatchIds();
    return data.batchIds
  }

  // Getters
  getBatchIds() {
    return this.#batchIds;
  }

  async getBatchStatus(batchId) {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.#bearerHeader()
      }
    };
    
    try {
      const response = await axios(this.prefix+CONTRACTS_SUFFIX+this.contractAddress+BATCHES_SUFFIX+batchId, options);
      const data = response.data;
      if (data.success) {
        return data.batch;
      } else {
        throw new Error(`Failed to receive batch status: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to recieve batch status: ${error}`);  
    }
  }

  async getAllBatchStatuses() {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.#bearerHeader()
      }
    };
    
    try {
      let batches = []
      let cursor = 'something'
      while (cursor) {
        const response = await axios(this.prefix+CONTRACTS_SUFFIX+this.contractAddress+BATCHES_SUFFIX, options);
        const data = response.data;
        if (data.success) {
          batches = batches.concat(data.batches)
          cursor = data.cursor
        } else {
          throw new Error(`Failed to receive all batch status: ${data.error}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to recieve all batch status: ${error}`);  
    }
    return batches
  }

  async getContractPointsBalance(contractAddress = this.contractAddress) {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.#bearerHeader()
      }
    };
    
    try {
      const response = await axios(this.prefix+CONTRACTS_SUFFIX+contractAddress+BALANCE_SUFFIX, options);
      const data = response.data;
      if (data.success) {
        return data.balancesByPointType;
      } else {
        throw new Error(`Failed to receive contract points data: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to recieve contract points data: ${error}`);  
    }
  }

  
  // Delete
  async deleteBatch(batchId) {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }

    const options = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.#bearerHeader()
      }
    };
    
    try {
      const response = await axios(this.prefix+CONTRACTS_SUFFIX+this.contractAddress+BATCHES_SUFFIX+batchId, options);
      const data = response.data;
      if (data.success) {
        return data.batch;
      } else {
        throw new Error(`Failed to receive batch status: ${data.error}`);
      }
    } catch (error) {
      throw new Error(`Failed to recieve batch status: ${error}`);  
    }
  }

  deleteBearerToken() {
    this.#bearerToken = undefined;
  }
 
  // Private utils
  async #signMessage(message) {
    const prefix = '\x19Ethereum Signed Message:\n' + message.length;
    const prefixedMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(prefix + message));
    const signature = await this.#wallet.signMessage(ethers.utils.arrayify(prefixedMessage));

    return signature;
  }

  #bearerHeader() {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }
    return "Bearer " + this.#bearerToken;
  }

  #saveBatchIds() {
    fs.writeFileSync(this.#fileName, JSON.stringify(this.#batchIds));
  }

  #validateBatchInputs(pointType, transfers) {
      // Constants for minimum transfer sizes and max decimal places
      const MINIMUM_LIQUIDITY_TRANSFER_SIZE = 0.01
      const MINIMUM_DEVELOPER_TRANSFER_SIZE = 0.000001
      const MAX_TRANSFER_DECIMALS = 12

      if (pointType !== "LIQUIDITY" && pointType !== "DEVELOPER") {
        return false
      }

      if (!Array.isArray(transfers) || transfers.length === 0) {
        return false
      }

      for (let transfer of transfers) {
        if (typeof transfer.toAddress !== "string" || transfer.toAddress.trim() === "") {
          return false
        }
        if (typeof transfer.points !== "string" || transfer.points.trim() === "") {
          return false
        }

        const pointsNum = parseFloat(transfer.points);
        if (isNaN(pointsNum)) {
          return false
        }
        
        const decimalRegex = new RegExp(`^\\d+(\\.\\d{1,${MAX_TRANSFER_DECIMALS}})?$`);
        const minimumTransferSize = pointType === "LIQUIDITY" ? MINIMUM_LIQUIDITY_TRANSFER_SIZE : MINIMUM_DEVELOPER_TRANSFER_SIZE;
        if (pointsNum < minimumTransferSize || !decimalRegex.test(transfer.points)) {
          return false
        }
      }
      return true
  }


}
