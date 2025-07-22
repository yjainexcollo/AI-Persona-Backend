// src/graphql/apollo.js
const { ApolloServer } = require("apollo-server-express");
const schema = require("./schema");
const context = require("./context");
const logger = require("../utils/logger");

function createApolloServer() {
  return new ApolloServer({
    schema,
    context,
    introspection: process.env.NODE_ENV !== "production",
    playground: process.env.NODE_ENV !== "production",
    formatError: (err) => {
      logger.error("GraphQL Error: %o", err);
      return err;
    },
  });
}

module.exports = createApolloServer;
