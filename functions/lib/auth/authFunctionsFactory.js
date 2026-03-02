const functions = require('firebase-functions/v1');
const { ALLOWED_ASSIGNABLE_ROLES, CLINICAL_CALLABLE_ROLES } = require('./authConfig');
const { requireAuthenticatedEmail, upsertAllowedUserRole } = require('./authPolicies');

const createAuthFunctions = ({ admin, helpers }) => ({
  onUserCreated: functions.auth.user().onCreate(async user => helpers.assignRole(user)),
  setUserRole: functions.https.onCall(async (data, context) => {
    const callerEmail = helpers.normalizeEmail(context.auth?.token?.email);
    const hasAdminClaim = context.auth?.token?.role === 'admin';
    const isBootstrapAdmin = !!callerEmail && helpers.adminEmails.includes(callerEmail);

    if (!context.auth || (!hasAdminClaim && !isBootstrapAdmin)) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles');
    }

    const rawEmail = typeof data?.email === 'string' ? data.email : '';
    const rawRole = typeof data?.role === 'string' ? data.role : '';
    const email = helpers.normalizeEmail(rawEmail);
    const role = helpers.normalizeEmail(rawRole);

    if (!email || !role) {
      throw new functions.https.HttpsError('invalid-argument', 'Email and role are required');
    }

    if (!ALLOWED_ASSIGNABLE_ROLES.has(role)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid role. Allowed roles: ${Array.from(ALLOWED_ASSIGNABLE_ROLES).join(', ')}`
      );
    }

    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });
      await upsertAllowedUserRole(admin, userRecord.uid, email, role);
      return { success: true, message: `Role ${role} assigned to ${email}` };
    } catch (error) {
      console.error(`Error setting role for ${email}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to update user role');
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

    const roleClaim = context.auth.token?.role;
    if (roleClaim && CLINICAL_CALLABLE_ROLES.has(roleClaim)) {
      return { authorized: true, role: 'downloader' };
    }

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
