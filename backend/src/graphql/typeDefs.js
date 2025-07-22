// src/graphql/typeDefs.js
const { gql } = require("apollo-server-express");

module.exports = gql`
  scalar DateTime
  scalar EmailAddress

  type Query {
    _health: String!
  }

  type Mutation {
    _empty: String
  }
`;
