const verifyFirebaseToken = require('./verifyFirebaseToken');
const verifyAdmin = require('./verifyAdmin');

/**
 * Automação (ex.: watch script): header X-Import-Secret igual a IMPORT_INTERNAL_SECRET.
 * Caso contrário: Firebase JWT + custom claim admin.
 */
module.exports = function verifyImportAccess(req, res, next) {
  const secret = process.env.IMPORT_INTERNAL_SECRET;
  if (secret && req.headers['x-import-secret'] === secret) {
    req.importViaSecret = true;
    return next();
  }
  return verifyFirebaseToken(req, res, () => verifyAdmin(req, res, next));
};
