#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Carrega variáveis de ambiente do backend/.env (se existir)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Inicializa o Firebase Admin através do módulo já existente
const admin = require('../config/firebaseAdmin');
const db = admin.firestore();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Uso: node import-eventos.js <caminho-para-json> [--dry-run]');
  process.exit(1);
}

const fileArg = args.find((a) => !a.startsWith('-'));
const dryRun = args.includes('--dry-run') || args.includes('-n');

const filePath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);

if (!fs.existsSync(filePath)) {
  console.error('Arquivo não encontrado:', filePath);
  process.exit(1);
}

async function main() {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    let items = JSON.parse(raw);
    if (!Array.isArray(items)) items = [items];

    console.log(`Preparando importação de ${items.length} evento(ões)`);

    // Dry-run: apenas mostrar mapeamento
    if (dryRun) {
      items.forEach((it, idx) => {
        const mapped = mapItem(it);
        console.log(`--- Item ${idx + 1} ---`);
        console.log(JSON.stringify(mapped, null, 2));
      });
      console.log('Dry-run finalizado. Nenhuma escrita foi efetuada.');
      return;
    }

    const batch = db.batch();
    items.forEach((it) => {
      const mapped = mapItem(it);
      const docId = String(mapped.id || mapped.name || Date.now());
      const docRef = db.collection('eventos').doc(docId);
      batch.set(docRef, mapped, { merge: true });
    });

    console.log('Enviando batch para o Firestore...');
    await batch.commit();
    console.log('Importação concluída com sucesso.');
  } catch (err) {
    console.error('Erro durante a importação:', err);
    process.exit(1);
  }
}

function mapItem(item) {
  // Mapeia campos do formato do wpp bot para o formato esperado pelo frontend
  const mapped = {
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
    // Mantém o objeto original como referência para rastreabilidade
    source: item,
  };
  return mapped;
}

main();
