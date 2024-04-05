import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { CHALLENGE_SUFFIX, SOLVE_SUFFIX, CONTRACTS_SUFFIX, BATCHES_SUFFIX, BALANCE_SUFFIX } from './suffixes.js';
import mockAxios from './mock/blast_points.js';
import axios from 'axios';
import fs from 'fs'

export class BlastPointsAPI {
  #wallet;
  #bearerToken
  #dataChallenge;
  #message;
  #batchIds;
  #fileName;
  #apiCall;
  #type;

  contractAddress;
  operatorAddress;
  distributionList;
  batchSize;  prefix;
  

  constructor(prefix, privateKey, contractAddress, operatorAddress, type, isTest = true, batchSize = 20, fileName = 'cache/blast_batch_ids.json') {
    if (prefix === undefined || contractAddress === undefined || operatorAddress === undefined) {
      throw new Error('prefix, contractAddress, and operatorAddress are required');
    }
    if (!privateKey || privateKey.length !== 66 || !privateKey.startsWith('0x')) {
        throw new Error('Invalid #key provided.');
    }
    if (type !== "POINTS" && type !== "GOLD") {
      throw new Error("Type not specified properly")
    }
    this.prefix = prefix;
    this.contractAddress = contractAddress;
    this.operatorAddress = operatorAddress;
    this.#apiCall = isTest ? mockAxios : axios;
    this.distributionList = []
    this.batchSize = batchSize;
    
    this.#type = type === "POINTS" ? "LIQUIDITY" : "DEVELOPER";
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
    
    const signature = await this.#signMessage(this.#message);

    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      data: `{"challengeData":"${this.#dataChallenge}","signature":"${signature}"}`
    };

    try {
      // Use axios either way
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
      data: `{"contractAddress":"${this.contractAddress}","operatorAddress":"${this.operatorAddress}"}`
    };

    try {
      // Use axios either way
      const response = await axios(this.prefix+CHALLENGE_SUFFIX, options);
      const data = response.data;
      console.log("data: ", data)
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
  async submitBatch(transfers) {
    if (this.#bearerToken === undefined) {
      throw new Error('Bearer token not obtained');
    }
    
    if (!this.#validateBatchInputs(transfers)) {
      throw new Error('Invalid batch inputs');
    }
    const batchId = uuidv4();

    const body = {
      pointType: this.#type,
      transfers: transfers
    }

    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.#bearerHeader()
      },
      data: JSON.stringify(body)
    };

    try {
      const response = await this.#apiCall(this.prefix+CONTRACTS_SUFFIX+"/"+this.contractAddress+BATCHES_SUFFIX+"/"+batchId, options);
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
  getLocalBatchIds() {
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
      const response = await this.#apiCall(this.prefix+CONTRACTS_SUFFIX+"/"+this.contractAddress+BATCHES_SUFFIX+"/"+batchId, options);
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
      while (cursor !== null) {
        const response = await this.#apiCall(this.prefix+CONTRACTS_SUFFIX+"/"+this.contractAddress+BATCHES_SUFFIX, options);
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
      const response = await this.#apiCall(this.prefix+CONTRACTS_SUFFIX+"/"+contractAddress+BALANCE_SUFFIX, options);
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
      const response = await this.#apiCall(this.prefix+CONTRACTS_SUFFIX+"/"+this.contractAddress+BATCHES_SUFFIX+batchId, options);
      const data = response.data;
      if (data.success) {
        return true;
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
    const signature = await this.#wallet.signMessage(message);
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

  #validateBatchInputs(transfers) {
      // Constants for minimum transfer sizes and max decimal places
      const MINIMUM_LIQUIDITY_TRANSFER_SIZE = 0.01
      const MINIMUM_DEVELOPER_TRANSFER_SIZE = 0.000001
      const MAX_TRANSFER_DECIMALS = 12

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
