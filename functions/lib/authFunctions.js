const functions = require('firebase-functions/v1');

const ADMIN_EMAILS = [
  'daniel.opazo@hospitalhangaroa.cl',
  'd.opazo.damiani@gmail.com',
  'd.opazo.damiani@hospitalhangaroa.cl',
  'danielopazodamiani@gmail.com',
];

const NURSE_EMAILS = [
  'hospitalizados@hospitalhangaroa.cl',
  'enfermeria.hospitalizados@hospitalhangaroa.cl',
];

const DOCTOR_EMAILS = ['medico.urgencia@hospitalhangaroa.cl'];
const GUEST_EMAILS = [];

const SHARED_CENSUS_ALLOWLIST_EMAILS = [
  'arenka.palma@hospitalhangaroa.cl',
  'natalia.arzola@hospitalhangaroa.cl',
  'vaitiare.hereveri@hospitalhangaroa.cl',
  'kaany.pakomio@hospitalhangaroa.cl',
  'claudia.salgado@hospitalhangaroa.cl',
  'bianca.atam@hospitalhangaroa.cl',
  'ana.pont@hospitalhangaroa.cl',
  'katherin.pont@hospitalhangaroa.cl',
  'eyleen.cisternas@hospitalhangaroa.cl',
  'marco.ramirez@hospitalhangaroa.cl',
  'josemiguel.villavicencio@hospitalhangaroa.cl',
  'carla.curinao@hospitalhangaroa.cl',
  'epidemiologia@hospitalhangaroa.cl',
  'archivosome@hospitalhangaroa.cl',
  'antonio.espinoza@hospitalhangaroa.cl',
  'juan.pakomio@hospitalhangaroa.cl',
  'ivan.pulgar@hospitalhangaroa.cl',
  'daniel.opazo@hospitalhangaroa.cl',
  'andrea.saldana@saludoriente.cl',
  'patricio.medina@saludoriente.cl',
  'gestion.camas@saludoriente.cl',
  'd.opazo.damiani@gmail.com',
  'd.opazo.damiani@hospitalhangaroa.cl',
];

const ALLOWED_ASSIGNABLE_ROLES = new Set([
  'admin',
  'nurse_hospital',
  'doctor_urgency',
  'viewer',
  'viewer_census',
  'unauthorized',
]);

const CLINICAL_CALLABLE_ROLES = new Set([
  'admin',
  'nurse_hospital',
  'doctor_urgency',
  'viewer',
  'viewer_census',
  'editor',
]);

const normalizeEmail = value => {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().trim();
};

const upsertAllowedUserRole = async (admin, uid, email, role) => {
  await admin.firestore().collection('allowedUsers').doc(uid).set(
    {
      email,
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const requireAuthenticatedEmail = context => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
  }

  const email = normalizeEmail(context.auth.token?.email);
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'User has no email associated.');
  }

  return email;
};

const createAuthHelpers = admin => {
  const resolveRoleForEmail = async email => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return 'unauthorized';

    try {
      const roleDoc = await admin.firestore().collection('config').doc('roles').get();
      if (roleDoc.exists) {
        const rolesMap = roleDoc.data() || {};
        if (rolesMap[cleanEmail]) {
          return rolesMap[cleanEmail];
        }
      }
    } catch (error) {
      console.warn(
        `⚠️ resolveRoleForEmail dynamic lookup failed for ${cleanEmail}: ${error.message}`
      );
    }

    if (ADMIN_EMAILS.includes(cleanEmail)) return 'admin';
    if (NURSE_EMAILS.includes(cleanEmail)) return 'nurse_hospital';
    if (DOCTOR_EMAILS.includes(cleanEmail)) return 'doctor_urgency';
    if (GUEST_EMAILS.includes(cleanEmail)) return 'viewer';

    return 'unauthorized';
  };

  const hasCallableClinicalAccess = async context => {
    if (!context?.auth) return false;

    const claimRole = context.auth.token?.role;
    if (claimRole && CLINICAL_CALLABLE_ROLES.has(claimRole)) {
      return true;
    }

    const callerEmail = normalizeEmail(context.auth.token?.email);
    if (!callerEmail) return false;
    const resolvedRole = await resolveRoleForEmail(callerEmail);
    return CLINICAL_CALLABLE_ROLES.has(resolvedRole);
  };

  const isSharedCensusEmailAuthorized = async email => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return { authorized: false, role: 'viewer' };

    if (SHARED_CENSUS_ALLOWLIST_EMAILS.includes(cleanEmail)) {
      return { authorized: true, role: 'viewer' };
    }

    try {
      const docSnap = await admin
        .firestore()
        .collection('census-authorized-emails')
        .doc(cleanEmail)
        .get();

      if (!docSnap.exists) {
        return { authorized: false, role: 'viewer' };
      }

      const data = docSnap.data() || {};
      const role = data.role === 'downloader' ? 'downloader' : 'viewer';
      return { authorized: true, role };
    } catch (error) {
      console.error(`❌ Shared census authorization lookup failed for ${cleanEmail}:`, error);
      return { authorized: false, role: 'viewer' };
    }
  };

  const assignRole = async user => {
    const email = normalizeEmail(user.email);
    const role = await resolveRoleForEmail(email);

    try {
      await admin.auth().setCustomUserClaims(user.uid, { role });

      const statusIcon = role === 'unauthorized' ? '⛔' : '✅';
      console.info(`${statusIcon} Assigned role '${role}' to ${email}`);

      await upsertAllowedUserRole(admin, user.uid, email, role);

      if (role === 'unauthorized') {
        try {
          const rolesRef = admin.firestore().collection('config').doc('roles');
          await admin.firestore().runTransaction(async transaction => {
            const doc = await transaction.get(rolesRef);
            if (!doc.exists) return;

            const data = doc.data();
            if (!data[email]) return;

            const newData = { ...data };
            delete newData[email];
            transaction.set(rolesRef, newData);
            console.info(`🧹 Cleaned up ${email} from config/roles`);
          });
        } catch (cleanupError) {
          console.warn(`⚠️ Could not cleanup config/roles for ${email}: ${cleanupError.message}`);
        }
      }

      return role;
    } catch (error) {
      console.error(`❌ Error assigning role to ${email}:`, error);
      throw error;
    }
  };

  return {
    normalizeEmail,
    resolveRoleForEmail,
    hasCallableClinicalAccess,
    isSharedCensusEmailAuthorized,
    assignRole,
    adminEmails: ADMIN_EMAILS,
  };
};

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

      console.info(
        `✅ Manually assigned role '${role}' to ${email} (by ${context.auth.token.email})`
      );
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
      console.info(`🔍 Discovery: Secured role lookup for ${email}: ${role}`);
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
  createAuthHelpers,
  createAuthFunctions,
};
