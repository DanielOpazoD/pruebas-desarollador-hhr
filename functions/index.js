const { admin, dbBeta, HOSPITAL_CAPACITY } = require('./lib/appContext');
const { createMirrorFunctions } = require('./lib/mirrorFunctions');
const { createAuthHelpers, createAuthFunctions } = require('./lib/authFunctions');
const { createMinsalFunctions } = require('./lib/minsalFunctions');

const authHelpers = createAuthHelpers(admin);

module.exports = {
  ...createMirrorFunctions({ dbBeta, admin }),
  ...createMinsalFunctions({
    admin,
    hospitalCapacity: HOSPITAL_CAPACITY,
    hasCallableClinicalAccess: authHelpers.hasCallableClinicalAccess,
  }),
  ...createAuthFunctions({
    admin,
    helpers: authHelpers,
  }),
};
