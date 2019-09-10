# Funding API
Provides an API to determine the funds that have been devoted to the 121-Project by a specific organization.

# Usage
Exposes an endpoint for GET requests at `http://localhost:funding/{account_id}/{since_timestamp?}` (since\_timestamp defaults to 0 if omitted).

This service provides access to data from the Disberse platform, so it's usage in a development environment is reliant on seed data. This seed data was generated using [Disberse/121-smart-contracts](https://github.com/Disberse/121-smart-contracts) and is available in a docker image ([disberse/121-bchain](https://cloud.docker.com/repository/registry-1.docker.io/disberse/121-bchain)).

#### Dependencies
- `node`
- `docker`
- `docker-compose`

#### To start a server with some sane seed data
- `npm start`

#### To start a server with specific seed data
- `npm run start:{migration_number}`, where `{migration_number}` is the number used to access the seed data in a migrationsConfig.json file. Currently, you will only see 2 choices for migration seed data after running `docker-compose up`, but we are happy to provide a wider variety of data for testing.

#### To shutdown the docker container(s)
- `npm run deps:close`

#### To start the blockchain container without running the node server
- `npm run deps:start`

#### To run only the server, assuming you have your own Ethereum node running locally
- `npm run start:devl`

#### To provide your own seed data
- See [Disberse/121-smart-contracts](https://github.com/Disberse/121-smart-contracts). Ultimately, you need to provide seed data on an Ethereum node running on port 8545 and accepting rpc requests. This can be done via building a new docker image or running ganache-cli and contract migrations locally.
