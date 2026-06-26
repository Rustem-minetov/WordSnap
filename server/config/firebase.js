const admin = require('firebase-admin');

const initializeFirebase = () => {
  if (admin.apps.length > 0) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase Admin SDK not fully configured. Some features may not work.');
    return null;
  }

  // Handle escaped newlines in private key
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
    return null;
  }
};

module.exports = { initializeFirebase, admin };
