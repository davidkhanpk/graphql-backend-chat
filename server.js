const { ApolloServer, gql } = require("apollo-server");
const { sequelize } = require("./models");
// require('dotenv').config()

// The GraphQL schema
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const contextMiddleware = require("./utils/contextMiddleware");

const PORT = process.env.PORT || 4000;

const server = new ApolloServer({
  //comment added
  typeDefs,
  resolvers,
  context: contextMiddleware,
  subscriptions: { path: "/" },
});

server.listen({ port: PORT }).then(({ url, subUrl }) => {
  console.log(`🚀 Server ready at ${url}`);
  console.log(`🚀 Subscription ready at ${subUrl}`);
  sequelize
    .authenticate()
    .then(() => {
      console.log("Database Connected");
    })
    .catch();
});

const express = require("express");
const http = require("http");
const PeerDataServer = require("peer-data-server");
var cors = require('cors');
const app = express();

const appendPeerDataServer = PeerDataServer.default || PeerDataServer;
app.use(cors())
const socketServer = http.createServer(app);

appendPeerDataServer(socketServer);
socketServer.listen(8080, () => console.log(`Server started at port 5000`));

