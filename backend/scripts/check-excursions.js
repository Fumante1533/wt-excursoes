const admin = require('../config/firebaseAdmin');

async function check() {
  const db = admin.firestore();
  try {
    const snap = await db.collection('excursions').get();
    console.log(`Eventos em 'excursions': ${snap.size}`);
    snap.docs.forEach(d => {
        console.log(`- ID: ${d.id}, Nome: ${d.data().name}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
