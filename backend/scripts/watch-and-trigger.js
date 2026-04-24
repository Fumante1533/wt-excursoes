#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const targetFile = process.argv[2] || path.resolve(__dirname, '..', '..', '..', 'wpp bot', 'excursoes.json');
const endpoint = process.env.IMPORT_ENDPOINT || 'http://localhost:3001/api/import-excursions';
const debounceMs = 1000;
const importDestDir = path.resolve(__dirname, '..', 'data', 'imports');

let timeout = null;

console.log('Observando arquivo:', targetFile);

fs.mkdirSync(importDestDir, { recursive: true });

fs.watch(targetFile, { persistent: true }, (eventType, filename) => {
  if (filename) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
      console.log(`Detectado ${eventType} em ${filename}. Sincronizando import...`);
      try {
        const base = path.basename(targetFile);
        const dest = path.join(importDestDir, base);
        fs.copyFileSync(targetFile, dest);

        const headers = { 'Content-Type': 'application/json' };
        if (process.env.IMPORT_INTERNAL_SECRET) {
          headers['X-Import-Secret'] = process.env.IMPORT_INTERNAL_SECRET;
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({ fileName: base, dryRun: false }),
        });
        const json = await res.json().catch(() => ({}));
        console.log('Resposta do endpoint:', res.status, json);
      } catch (err) {
        console.error('Erro ao chamar endpoint:', err.message || err);
      }
    }, debounceMs);
  }
});
