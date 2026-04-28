const admin = require('../config/firebaseAdmin');

async function migrate() {
  const db = admin.firestore();
  try {
    const eventosSnapshot = await db.collection('eventos').get();
    console.log(`Encontrados ${eventosSnapshot.size} eventos na coleção 'eventos'.`);
    
    for (const doc of eventosSnapshot.docs) {
      const data = doc.data();
      console.log(`Migrando evento: ${data.name || doc.id}`);
      await db.collection('excursions').doc(doc.id).set(data);
      // await db.collection('eventos').doc(doc.id).delete(); // Opcional: deletar após migrar
    }
    
    console.log('Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error);
    process.exit(1);
  }
}

migrate();
