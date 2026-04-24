/**
 * Deve ser usado após verifyFirebaseToken.
 * Exige custom claim `admin: true` no token Firebase.
 */
module.exports = function verifyAdmin(req, res, next) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  if (req.user.admin !== true) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  return next();
};
