const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');
const { HOSPITAL_CAPACITY } = require('./runtime/runtimeConfig');

admin.initializeApp();

const parseSecondaryServiceAccount = () => {
  let runtimeConfig = {};
  try {
    runtimeConfig = typeof functions.config === 'function' ? functions.config() || {} : {};
  } catch (_error) {
    runtimeConfig = {};
  }

  const rawJson =
    process.env.BETA_SERVICE_ACCOUNT_JSON || runtimeConfig?.mirror?.beta_service_account_json;
  const rawB64 =
    process.env.BETA_SERVICE_ACCOUNT_JSON_B64 ||
    runtimeConfig?.mirror?.beta_service_account_json_b64;

  if (!rawJson && !rawB64) {
    return null;
  }

  try {
    const json = rawJson || Buffer.from(rawB64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (error) {
    console.error('BETA service account secret is malformed:', error.message);
    return null;
  }
};

let secondaryApp;
const serviceAccountCredentials = parseSecondaryServiceAccount();
if (serviceAccountCredentials) {
  try {
    secondaryApp = admin.initializeApp(
      {
        credential: admin.credential.cert(serviceAccountCredentials),
      },
      'secondary'
    );
  } catch (error) {
    console.error('Failed to initialize secondary Firebase app:', error.message);
  }
} else {
  console.error(
    'Missing BETA service account secret. Configure BETA_SERVICE_ACCOUNT_JSON/B64 (or functions config mirror.beta_service_account_json/_b64).'
  );
}

const dbBeta = secondaryApp ? secondaryApp.firestore() : null;
module.exports = {
  admin,
  dbBeta,
  HOSPITAL_CAPACITY,
};
