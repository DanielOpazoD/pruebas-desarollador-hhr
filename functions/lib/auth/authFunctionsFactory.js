const functions = require('firebase-functions/v1');
const { CLINICAL_CALLABLE_ROLES } = require('./authConfig');
const {
  assertAssignableRole,
  assertRoleMutationAccess,
  parseRoleMutationRequest,
} = require('./authCallablePolicy');
const { requireAuthenticatedEmail } = require('./authPolicies');

const applyRoleClaim = async (adminAuth, uid, role) => {
  const userRecord = await adminAuth.getUser(uid);
  const nextClaims = { ...(userRecord.customClaims || {}) };

  if (role) {
    nextClaims.role = role;
  } else {
    delete nextClaims.role;
  }

  await adminAuth.setCustomUserClaims(uid, nextClaims);
};

const createAuthFunctions = ({ admin, helpers }) => ({
  onUserCreated: functions.auth.user().onCreate(async user => helpers.assignRole(user)),
  setUserRole: functions.https.onCall(async (data, context) => {
    const callerEmail = helpers.normalizeEmail(context.auth?.token?.email);
    assertRoleMutationAccess({
      context,
      callerEmail,
      adminEmails: helpers.adminEmails,
    });

    const { rawEmail, rawRole } = parseRoleMutationRequest(data);
    const email = helpers.normalizeEmail(rawEmail);
    const role = helpers.normalizeEmail(rawRole);
    assertAssignableRole(email, role);

    try {
      const adminAuth = admin.auth();
      const userRecord = await adminAuth.getUserByEmail(email);
      await applyRoleClaim(adminAuth, userRecord.uid, role);
      return { success: true, message: `Role ${role} assigned to ${email}` };
    } catch (error) {
      console.error(`Error setting role for ${email}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to update user role');
    }
  }),
  syncCurrentUserRoleClaim: functions.https.onCall(async (_data, context) => {
    const email = requireAuthenticatedEmail(context);

    try {
      const resolvedRole = await helpers.resolveRoleForEmail(email);
      const adminAuth = admin.auth();
      await applyRoleClaim(
        adminAuth,
        context.auth.uid,
        resolvedRole === 'unauthorized' ? null : resolvedRole
      );
      return {
        role: resolvedRole === 'unauthorized' ? null : resolvedRole,
        synced: true,
      };
    } catch (error) {
      console.error(`Error syncing role claim for ${email}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to sync current user role claim');
    }
  }),
  checkUserRole: functions.https.onCall(async (_data, context) => {
    const email = requireAuthenticatedEmail(context);

    try {
      const role = await helpers.resolveRoleForEmail(email);
      return { role };
    } catch (error) {
      console.error(`❌ Discovery Error for ${email}:`, error);
      throw new functions.https.HttpsError('internal', 'Error retrieving account permissions.');
    }
  }),
  checkSharedCensusAccess: functions.https.onCall(async (_data, context) => {
    const email = requireAuthenticatedEmail(context);
    const roleFromConfig = await helpers.resolveRoleForEmail(email);
    if (CLINICAL_CALLABLE_ROLES.has(roleFromConfig)) {
      return { authorized: true, role: 'downloader' };
    }

    const authorization = await helpers.isSharedCensusEmailAuthorized(email);
    return {
      authorized: authorization.authorized,
      role: authorization.role,
    };
  }),
});

module.exports = {
  createAuthFunctions,
};
