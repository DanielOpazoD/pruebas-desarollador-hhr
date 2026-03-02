const { createAuthHelpers } = require('./auth/authHelpersFactory');
const { createAuthFunctions } = require('./auth/authFunctionsFactory');

module.exports = {
  createAuthHelpers,
  createAuthFunctions,
};
