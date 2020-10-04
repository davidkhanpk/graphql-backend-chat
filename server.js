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
const app = express();
const socketServer = http.createServer(app);
const socket = require("socket.io");
const io = socket(socketServer);
let users = {}
let usersArray = []

io.on('connection', socket => {
  if (!users[socket.id]) {
      users[socket.id] = socket.id;
  }
  socket.on('saveData', (data) => {
    let index = usersArray.findIndex(x => x.username == data.username);
    if(index > -1) {
      usersArray.splice(index, 1)
    }
    data.socketId = socket.id;
    usersArray.push(data);
  })

  socket.on("callUser", (data) => {
    console.log(data)
      let index = usersArray.findIndex(x => x.username == data.to);
      console.log(index)
      if(index > -1) {
        let socketId = usersArray[index].socketId
        io.to(socketId).emit('incomingCall', {from : data.from});
      }
  })

  socket.on("callAccepted", (data) => {
    console.log(data)
    let index = usersArray.findIndex(x => x.username == data.to.from)
    if(index > -1) {
      let socketId = usersArray[index].socketId;
      io.to(socketId).emit('callPerr', data);
    }
  })
  socket.on("peerShare", (data) => {
    console.log(data);
    let index = usersArray.findIndex(x => x.username == data.to)
    if(index > -1) {
      let socketId = usersArray[index].socketId;
      io.to(socketId).emit('peerData', data);
    }
  })
});

socketServer.listen(8000, () => console.log('server is running on port 8000'));
