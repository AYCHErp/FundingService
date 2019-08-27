"use strict"

const ethers = require("ethers");
const async = require("async");

class BChainHandler {

  // TODO: needs to take multiple token contracts
  constructor(provider, token, exchangeLogger) {
    Object.defineProperties(this, {
      _provider       : {value: provider},
      _token          : {value: token},
      _exchangeLogger : {value: exchangeLogger}
    });
  }

  get token() {
    return this._token;
  }

  get exchangeLogger() {
    return this._exchangeLogger
  }

  get provider() {
    return this._provider;
  }

  async init() {
    this._token.currency = await this._token.symbol();
    console.log("token currency", this._token.currency);
  }

  async _getBurnEvents(bin, fromBlock) {
    const evnt = this.token.interface.events.Burn;

    // TODO: add a filter for the src
    const topics = [ evnt.topic, null, bin ];
    return this.provider.getLogs({
      fromBlock: fromBlock,
      toBlock: "latest",
      address: this.token.address,
      topics: topics
    });
  }

  async _getExchangeEvent(hash) {
    const evnt = this.exchangeLogger.interface.events.LogExchange;
    const topics = [ evnt.topic, hash ];
    return this.provider.getLogs({
      fromBlock: 0,
      toBlock: "latest",
      address: this.exchangeLogger.address,
      topics: topics
    });
  }

  _getBurnEventHash(evnt) {
    const evntData = {
      "transactionHash": evnt.transactionHash,
      "address": evnt.address,
      "topics": evnt.topics
    }
    const hashMsg = "0x" + Buffer.from(JSON.stringify(evntData)).toString("hex");
    return ethers.utils.keccak256(hashMsg);
  }

  // TODO: needs to take fromTimestamp instead of block
  async getBurnedFunds(bin, fromBlock = 0) {
    const burnEvents = await this._getBurnEvents(bin, fromBlock);
    let burnedFunds = []

    for (const evnt of burnEvents) {
      const hash = this._getBurnEventHash(evnt);
      const exchangeEvent = await this._getExchangeEvent(hash)

      // TODO: need to convert the currency from exchangeEvent to utf8
      const fundsRedeemed = exchangeEvent.length === 1 ?
        {amount: ethers.utils.bigNumberify(exchangeEvent[0].data).toString(), currency: exchangeEvent[0].topics[2]} :
        {amount: ethers.utils.bigNumberify(evnt.data).toString(), currency: this._token.currency};

      burnedFunds.push(fundsRedeemed);
    }

    return burnedFunds;
  }
}

module.exports = exports = BChainHandler;
