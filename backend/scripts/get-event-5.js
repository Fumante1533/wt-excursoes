const admin = require('../config/firebaseAdmin');

async function check() {
  const db = admin.firestore();
  try {
    const doc = await db.collection('excursions').doc('9').get();
    console.log(JSON.stringify(doc.data(), null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
