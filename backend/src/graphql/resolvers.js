// src/graphql/resolvers.js
const scalars = require("./scalars");

module.exports = {
  DateTime: scalars.DateTime,
  EmailAddress: scalars.EmailAddress,
  Query: {
    _health: () => "OK",
  },
  Mutation: {},
};
