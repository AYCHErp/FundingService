"use strict"

const fs = require("fs");
const config = JSON.parse(fs.readFileSync("./config/migrationsConfig.json", "utf8"));
const addresses = config["migration_" + process.env.MIGRATION];

const BChainHandler = require("./BChainHandler.js");
const ethers = require("ethers");
const Token = require("../artifacts/DisberseToken.json").abi;
const ExchangeLogger = require("../artifacts/ExchangeLogger.json").abi;

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
const token = new ethers.Contract(addresses.tokenAddr, Token, provider);
const tokens = [{symbol: "EUR", contract: token}];
const exchangeLogger = new ethers.Contract(addresses.exchangeLoggerAddr, ExchangeLogger, provider);
const bChainHandler = new BChainHandler(provider, exchangeLogger, tokens);

const BIN_NAME = "0x" + Buffer.from("121-project").toString("hex")
const bin = ethers.utils.keccak256(BIN_NAME);

const routes = [];

console.log(`\n\nSeeded user address: ${addresses.userAddr}`);

routes.push({
  method: "GET",
  path: "/funding/{address}/{since_timestamp?}",
  handler: async (request, h) => {
    try {
      const fromTs = request.params.since_timestamp ? request.params.since_timestamp : 0
      return await bChainHandler.getBurnedFunds(
        Number(fromTs),
        request.params.address,
        bin
      );
    } catch(err) {
      console.log(err)
      throw(err)
    }
  }
});

module.exports = routes;
