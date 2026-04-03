const decodeBase64 = value => {
  if (!value) return '';
  try {
    const normalized = String(value)
      .trim()
      .replace(/\s+/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');

    return Buffer.from(normalized, 'base64').toString('utf-8');
  } catch (error) {
    console.warn('Unable to decode base64 Firebase key', error);
    return '';
  }
};

const buildConfig = () => {
  const base64Key = process.env.VITE_FIREBASE_API_KEY_B64;
  const plainKey = process.env.VITE_FIREBASE_API_KEY;
  const apiKey = base64Key ? decodeBase64(base64Key) : plainKey || '';

  return {
    apiKey,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
  };
};

const getMissingFields = config =>
  ['apiKey', 'projectId', 'appId'].filter(field => !String(config[field] || '').trim());

export const handler = async () => {
  const config = buildConfig();
  const missingFields = getMissingFields(config);

  if (missingFields.length > 0) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({
        message: `Missing Firebase configuration fields: ${missingFields.join(', ')}.`,
        missingFields,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: JSON.stringify(config),
  };
};
