import * as _ from 'lodash'
import BigNumber from 'bignumber'
import contract from 'truffle-contract'
import ContractWrapper from './ContractWrapper'
import KlerosWrapper from './KlerosWrapper'
import arbitrableTransaction from 'kleros-interaction/build/contracts/ArbitrableTransaction'
import config from '../../config'
import { DISPUTE_STATUS } from '../../constants'

/**
 * ArbitrableTransaction API
 */
class ArbitrableTransactionWrapper extends ContractWrapper {
  /**
   * Constructor ArbitrableTransaction.
   * @param web3 instance
   * @param address of the contract (optional)
   */
  constructor(web3Provider, address) {
    super(web3Provider)
    if (!_.isUndefined(address)) {
      this.address = address
    }
    this.contractInstance = null
  }

  /**
   * Deploy ArbitrableTransaction.
   * @param account Ethereum account (default account[0])
   * @param value funds to be placed in contract
   * @param hashContract Keccak hash of the plain English contract. (default null hashed)
   * @param arbitratorAddress The address of the arbitrator contract
   * @param timeout Time after which a party automatically loose a dispute. (default 3600)
   * @param partyB The recipient of the transaction. (default account[1])
   * @param arbitratorExtraData Extra data for the arbitrator. (default empty string)
   * @return truffle-contract Object | err The deployed contract or an error
   */
  deploy = async (
      account = this._Web3Wrapper.getAccount(0),
      value = config.VALUE,
      hashContract = 0x6aa0bb2779ab006be0739900654a89f1f8a2d7373ed38490a7cbab9c9392e1ff,
      arbitratorAddress,
      timeout = 100,
      partyB = this._Web3Wrapper.getAccount(1),
      arbitratorExtraData = '',
    ) => {

    const contractDeployed = await this._deployAsync(
      account,
      value,
      arbitrableTransaction,
      arbitratorAddress,
      hashContract,
      timeout,
      partyB,
      arbitratorExtraData
    )

    this.address = contractDeployed.address
    this.contractInstance = contractDeployed

    return contractDeployed
  }

  /**
   * Load an existing arbitrableTransaction contract
   * @param address Contract address
   * @return contractInstance | Error
   */
  load = async address => {
    // return contract instance if already loaded
    if (this.contractInstance && this.contractInstance.address === address) return this.contractInstance

    try {
      const contractInstance = await this._instantiateContractIfExistsAsync(
        arbitrableTransaction,
        address
      )

      this.contractInstance = contractInstance
      this.address = address

      return contractInstance
    } catch (e) {
      throw new Error(e)
    }
  }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party A.
   * @param account Ethereum account (default account[1])
   * @param arbitrationCost Amount to pay the arbitrator. (default 10000 wei)
   * @return txHash hash transaction | Error
   */
   payArbitrationFeeByPartyA = async (
     account = this._Web3Wrapper.getAccount(0),
     contractAddress, // ethereum address of the contract
     arbitrationCost = 0.15,
   ) => {
     try {
       this.contractInstance = await this.load(contractAddress)
       const txHashObj = await this.contractInstance
         .payArbitrationFeeByPartyA(
         {
           from: account,
           gas: config.GAS,
           value: this._Web3Wrapper.toWei(arbitrationCost, 'ether'),
         }
       )

       return txHashObj.tx
     } catch (e) {
       throw new Error(e)
     }
   }

  /**
   * Pay the arbitration fee to raise a dispute. To be called by the party B.
   * @param account Ethereum account (default account[1])
   * @param arbitrationCost Amount to pay the arbitrator. (default 10000 wei)
   * @return txHash hash transaction | Error
   */
   payArbitrationFeeByPartyB = async (
     account = this._Web3Wrapper.getAccount(1),
     contractAddress, // ethereum address of the contract
     arbitrationCost = 0.15
   ) => {
     try {
       this.contractInstance = await this.load(contractAddress)
       const txHashObj = await this.contractInstance
         .payArbitrationFeeByPartyB(
         {
           from: account,
           gas: config.GAS,
           value: this._Web3Wrapper.toWei(arbitrationCost, 'ether')
         }
       )

       return txHashObj.tx
     } catch (e) {
       throw new Error(e)
     }
   }

  /**
   * Submit a reference to evidence. EVENT.
   * @param evidence A link to an evidence using its URI.
   * @return txHash Hash transaction
   */
  submitEvidence = async (
    account = this._Web3Wrapper.getAccount(0),
    contractAddress,
    name,
    description = '',
    url
  ) => {
    this.contractInstance = await this.load(contractAddress)
    const txHashObj = await this.contractInstance
      .submitEvidence(
        JSON.stringify(
          name,
          description,
          url
        ),
        {
          from: account,
          gas: config.GAS,
          value: 0
        }
      )

    return txHashObj.tx
  }

  /**
  * Data of the contract
  * @param account Address of the party.
  * @param address Address of the ArbitrableTransaction contract.
  * @return Object Data of the contract.
  */
  getData = async (
    address
  ) => {
    const contractInstance = await this.load(address)

    const [
      arbitrator,
      // hashContract, // FIXME getter for the hash contract see contractHash see https://github.com/kleros/kleros-interaction/blob/master/test/TwoPartyArbitrable.js#L19
      extraData,
      timeout,
      partyA,
      partyB,
      status,
      arbitratorExtraData,
      disputeId,
      partyAFee,
      partyBFee
      ] = await Promise.all(
        [
          contractInstance.arbitrator.call(),
          contractInstance.arbitratorExtraData.call(),
          //  contractInstance.hashContract.call(),
          contractInstance.timeout.call(),
          contractInstance.partyA.call(),
          contractInstance.partyB.call(),
          contractInstance.status.call(),
          contractInstance.arbitratorExtraData.call(),
          contractInstance.disputeID.call(),
          contractInstance.partyAFee.call(),
          contractInstance.partyBFee.call(),
        ]
      ).catch(err => {
        throw new Error(err)
      })

    return {
      address,
      arbitrator,
      extraData,
      address,
      timeout: timeout.toNumber(),
      partyA,
      partyB,
      status: status.toNumber(),
      arbitratorExtraData,
      disputeId: disputeId.toNumber(),
      partyAFee: partyAFee.toNumber(),
      partyBFee: partyBFee.toNumber(),
    }
  }
}

export default ArbitrableTransactionWrapper