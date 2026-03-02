const {
  ADMIN_EMAILS,
  NURSE_EMAILS,
  DOCTOR_EMAILS,
  GUEST_EMAILS,
  SHARED_CENSUS_ALLOWLIST_EMAILS,
  CLINICAL_CALLABLE_ROLES,
} = require('./authConfig');
const { normalizeEmail, upsertAllowedUserRole } = require('./authPolicies');

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

module.exports = {
  createAuthHelpers,
};
