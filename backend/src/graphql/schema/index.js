// src/graphql/schema/index.js
const { makeExecutableSchema } = require("@graphql-tools/schema");
const typeDefs = require("../typeDefs");
const resolvers = require("../resolvers");

module.exports = makeExecutableSchema({
  typeDefs,
  resolvers,
});
