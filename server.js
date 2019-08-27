"use strict"

const {Server} = require("@hapi/hapi");
const routes = require("./src/routes");

const server = new Server({
  host: 'localhost',
  port: 8080
});

const setRoutes = () => {
  routes.forEach(route => {
    server.route(route)
  });
};

(async () => {
  try {
    setRoutes();
    await server.start();
    console.log('Server running at:', server.info.uri);
  } catch(err) {
    console.error(err);
    process.exit(ex.code || 1);
  }
})();
