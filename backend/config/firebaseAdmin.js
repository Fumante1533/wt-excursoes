const admin = require('firebase-admin');

try {
  let serviceAccount;
  try {
    serviceAccount = require('../service-account.json');
  } catch (err) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!serviceAccountBase64) {
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_BASE64 não foi definida.');
    }
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(serviceAccountJson);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('Firebase Admin SDK inicializado com sucesso para o projeto:', serviceAccount.project_id);

} catch (error) {
  console.error('Erro ao inicializar o Firebase Admin SDK:', error);
}

module.exports = admin;
