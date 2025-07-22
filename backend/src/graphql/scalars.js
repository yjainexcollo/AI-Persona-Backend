// src/graphql/scalars.js
const { DateTimeResolver, EmailAddressResolver } = require("graphql-scalars");

module.exports = {
  DateTime: DateTimeResolver,
  EmailAddress: EmailAddressResolver,
};
