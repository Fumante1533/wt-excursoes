const express = require('express');
const path = require('path');
const fs = require('fs');
const { importFromFile } = require('../lib/importer');
const verifyImportAccess = require('../middleware/verifyImportAccess');

const router = express.Router();

const IMPORT_ROOT = path.resolve(
  process.env.IMPORT_DATA_DIR || path.join(__dirname, '..', 'data', 'imports')
);

// POST /api/import-excursions
// Segurança: X-Import-Secret (IMPORT_INTERNAL_SECRET) OU Bearer token de admin Firebase.
// Body: { fileName: string, dryRun?: boolean }
// O arquivo deve existir dentro de IMPORT_ROOT (padrão: backend/data/imports).
router.post('/', verifyImportAccess, async (req, res) => {
  try {
    const { fileName, dryRun } = req.body || {};
    const name = path.basename(String(fileName || ''));
    if (!name || name === '.' || name === '..') {
      return res.status(400).json({ error: 'fileName inválido' });
    }
    const root = path.resolve(IMPORT_ROOT);
    const resolved = path.resolve(root, name);
    if (!resolved.startsWith(root + path.sep)) {
      return res.status(400).json({ error: 'Caminho inválido' });
    }
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no diretório de importação' });
    }

    const result = await importFromFile(resolved, { dryRun: !!dryRun });
    res.json({ ok: true, result });
  } catch (err) {
    console.error('Import error:', err.message || err);
    res.status(500).json({ ok: false, error: 'Falha na importação' });
  }
});

module.exports = router;
