const admin = require('../config/firebaseAdmin');

async function check() {
  const db = admin.firestore();
  try {
    const snap = await db.collection('blogPosts').get();
    console.log(`Posts em 'blogPosts': ${snap.size}`);
    snap.docs.forEach(d => {
        console.log(`- ID: ${d.id}, Título: ${d.data().title}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
