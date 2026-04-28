const admin = require('../config/firebaseAdmin');

async function fix() {
  const db = admin.firestore();
  try {
    await db.collection('excursions').doc('9').update({
      date: '2026-06-15'
    });
    console.log('Evento 5 atualizado com data!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fix();
