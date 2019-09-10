"use strict"

const ethers = require("ethers");
const Boom =  require("@hapi/boom");

class BChainHandler {

  // TODO: clear up decimal places
  constructor(provider, exchangeLogger, tokens = []) {
    Object.defineProperties(this, {
      _provider       : {value: provider},
      _tokens         : {value: tokens},
      _exchangeLogger : {value: exchangeLogger}
    });
  }

  /**
   * List of registered token objects
   * @returns [{ symbol: {String}, contract: {Contract} }]
   */
  get tokens() {
    return this._tokens;
  }

  /**
   * Registered exchange logger contract
   * @returns {Contract}
   */
  get exchangeLogger() {
    return this._exchangeLogger
  }

  /**
   * The ethers.js provider
   * @returns {Provider}
   */
  get provider() {
    return this._provider;
  }

  /**
   * Recursive binary search for the closest block to a given timestamp
   * @param {Uint} ts: unix timestamp to search for
   * @param {Uint} startBlock: block to start search from
   * @param {Uint} endBlock: block to stop search at
   * @returns {Uint} The block number with closest timestamp <= ts
   */
  async _blockSearch(ts, startBlock, endBlock) {
    const startTs = (await this._provider.getBlock(startBlock)).timestamp
    const endTs = (await this._provider.getBlock(endBlock)).timestamp

    // base condition
    if (startBlock === endBlock) {
      return startBlock;
    }

    const midBlock = Math.floor((startBlock + endBlock) / 2)
    const midTs = (await this._provider.getBlock(midBlock)).timestamp;

    if (midBlock === startBlock || midBlock == endBlock || ts === midTs ) {
      return midBlock;
    }

    if (ts > midTs) {
      return await this._timestampSearch(ts, midBlock, endBlock);
    }

    return await this._timestampSearch(ts, startBlock, midBlock);
  }

  // TODO: there should be a better way to do this
  /**
   * Takes a from_timestamp and returns the closest from_block
   * @param {Uint} ts: The timestamp to get the block number for
   * @returns {Uint} The block number with closest timestamp <= ts
   */
  async _timestampToBlockNum(ts) {
    // optimization since this will be a common timestamp
    if (ts === 0) {
      return 0;
    }

    const latestBlock = await this._provider.getBlock("latest");
    const latestTs = latestBlock.timestamp;

    if (ts > latestTs) { return "INVALID" }

    return this._blockSearch(ts, 1, latestBlock.number);
  }


  /**
   * Gets all of the requested ERC20 Burn events
   * @param {Contract} tokenContract: contract object to filter events for
   * @param {Uint} fromBlock: block to start filtering events at
   * @param {String} _src: The src parameter to filter for (20 bytes hex)
   * @param {String} bin: The token bin to filter for (32 bytes hex)
   * @returns [ {Event} ] List of events
   */
  async _getBurnEvents(tokenContract, fromBlock, _src, bin) {
    const evntSig = tokenContract.interface.events.Burn;

    // pad address to 32 bytes
    const src = "0x" + "0".repeat(24) + _src.substr(2).toLowerCase();

    const topics = [ evntSig.topic, src, bin ];
    return this.provider.getLogs({
      fromBlock: fromBlock,
      toBlock: "latest",
      address: tokenContract.address,
      topics: topics
    });
  }

  /**
   * Gets the latest exchange event associated with a particular hash
   * @param {String} hash: The hash to search for associated exchange events
   * for (32 bytes hex)
   * @returns {Event}
   */
  async _getExchangeEvent(hash) {
    const evntSig = this.exchangeLogger.interface.events.LogExchange;
    const topics = [ evntSig.topic, hash ];
    const evnt =  this.provider.getLogs({
      fromBlock: 0,
      toBlock: "latest",
      address: this.exchangeLogger.address,
      topics: topics
    });

    // TODO: in the event we need to "correct" an exchange event, should we return
    // evnt[0] or evnt[evnt.length - 1] here?
    return evnt[0];
  }

  /**
   * Gets the event hash based on the convention used by Disberse for logging
   * @param {Event} evnt: The event to hash
   * @returns {String} The event hash (32 bytes hex)
   */
  _getBurnEventHash(evnt) {
    const evntData = {
      "transactionHash": evnt.transactionHash,
      "address": evnt.address,
      "topics": evnt.topics
    }
    const hashMsg = "0x" + Buffer.from(JSON.stringify(evntData)).toString("hex");
    return ethers.utils.keccak256(hashMsg);
  }

  /**
   * Gets all of the funds burned from all registered token contracts
   * @param {Uint} fromTs: The unix timestamp to start searching at
   * @param {String} src: The address of interest (20 bytes hex)
   * @param {String} bin: The bin of interest (32 bytes hex)
   */
  async getBurnedFunds(fromTs, src, bin) {

    // get a block from the fromTimestamp
    const fromBlock = await this._timestampToBlockNum(fromTs);

    if (fromBlock === "INVALID") {
      throw Boom.internal(`from_timestamp invalid: ${fromTs}`)
    }

    let burns = [];
    for (const token of this._tokens) {
      const tokenBurnEvents = await this._getBurnEvents(token.contract, fromBlock, src, bin);

      tokenBurnEvents.forEach(evnt => {
        burns.push({
          symbol: token.symbol,
          evnt: evnt
        });
      });
    }

    let burnedFunds = [];
    for (const burn of burns) {
      const hash = this._getBurnEventHash(burn.evnt);
      const exchangeEvent = await this._getExchangeEvent(hash);

      let value;
      let symbol;
      if (exchangeEvent) {
        value = ethers.utils.bigNumberify(exchangeEvent.data).toString();
        symbol = ethers.utils.toUtf8String(exchangeEvent.topics[2]);
      } else {
        value = ethers.utils.bigNumberify(burn.evnt.data).toString();
        symbol = burn.symbol
      }

      const fundsRedeemed = {
        value: value,
        currency: symbol.substr(0,3),
        timestamp: (await this._provider.getBlock(burn.evnt.blockNumber)).timestamp
      }

      burnedFunds.push(fundsRedeemed);
    }

    return burnedFunds;
  }
}

module.exports = exports = BChainHandler;
