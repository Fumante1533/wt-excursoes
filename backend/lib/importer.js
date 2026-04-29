const fs = require('fs');
const path = require('path');
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();

function mapItem(item) {
  return {
    id: item.id !== undefined ? String(item.id) : undefined,
    name: item.nome || item.name || '',
    description: item.detalhes || item.description || '',
    image: item.url_imagem || item.image || '',
    date: item.data || item.date || null,
    location: item.local || item.location || '',
    category: item.categoria || item.category || '',
    tag: item.em_destaque ? 'Mais Vendido' : (item.tag || ''),
    images: item.images && item.images.length ? item.images : (item.url_imagem ? [item.url_imagem] : []),
    tickets: (item.tipos_ingresso || item.tickets || []).map((t) => ({
      type: t.tipo || t.type || '',
      price: Number(t.preco ?? t.price ?? 0),
    })),
    included: item.included || [],
    notIncluded: item.notIncluded || [],
    totalSlots: item.totalSlots ?? null,
    bookedSlots: item.bookedSlots ?? 0,
    source: item,
  };
}

async function importFromFile(filePath, options = { dryRun: false }) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let items = JSON.parse(raw);
  if (!Array.isArray(items)) items = [items];

  if (options.dryRun) {
    return items.map((it) => mapItem(it));
  }

  const batch = db.batch();
  items.forEach((it) => {
    const mapped = mapItem(it);
    const docId = String(mapped.id || mapped.name || Date.now());
    const docRef = db.collection('excursions').doc(docId);
    batch.set(docRef, mapped, { merge: true });
  });
  await batch.commit();
  return { imported: items.length };
}

module.exports = { importFromFile, mapItem };
