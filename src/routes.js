"use strict"

// TODO: this is just terrible

const BChainHandler = require("./BChainHandler.js");
const ethers = require("ethers");
const Token = require("../artifacts/DisberseToken.json").abi;
const ExchangeLogger = require("../artifacts/ExchangeLogger.json").abi;

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const token = new ethers.Contract(process.env.TOKEN_ADDR, Token, provider);
const exchangeLogger = new ethers.Contract(process.env.EXCHANGE_LOGGER_ADDR, ExchangeLogger, provider);
const bChainHandler = new BChainHandler(provider, token, exchangeLogger);

const BIN_NAME = "0x" + Buffer.from("121-project").toString("hex")
const bin = ethers.utils.keccak256(BIN_NAME);

const routes = [];

routes.push({
  method: 'GET',
  path: '/d121p/{address}/burned_funds/{fromBlock}',
  handler: async (request, h) => {
    await bChainHandler.init();
    try {
      return await bChainHandler.getBurnedFunds(bin)
    } catch(err) {
      console.log(err)
    }
  }
});

module.exports = routes;
