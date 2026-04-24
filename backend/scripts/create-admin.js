#!/usr/bin/env node
const path = require('path');
// Carrega variáveis de ambiente do backend/.env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const admin = require('../config/firebaseAdmin');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  args.forEach((arg) => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) opts[m[1]] = m[2];
  });
  return opts;
}

async function main() {
  const opts = parseArgs();
  const email = opts.email || process.env.ADMIN_EMAIL || 'admin@wtexcursoes.com';
  const password = opts.password || process.env.ADMIN_PASSWORD;
  const displayName = opts.displayName || 'Administrador';

  if (!password) {
    console.error('\nERRO: é necessário informar a senha do admin.\nInforme via --password=SuaSenhaOu defina ADMIN_PASSWORD no arquivo backend/.env\n');
    process.exit(1);
  }

  try {
    console.log(`Procurando usuário com email: ${email}`);
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Usuário encontrado, atualizando (senha/displayName)...');
      await admin.auth().updateUser(userRecord.uid, { password, displayName });
      console.log('Usuário atualizado.');
    } catch (err) {
      if (err.code === 'auth/user-not-found' || /user-not-found/.test(err.message)) {
        console.log('Usuário não encontrado, criando novo usuário...');
        userRecord = await admin.auth().createUser({ email, password, displayName });
        console.log('Usuário criado.');
      } else {
        throw err;
      }
    }

    // Define a custom claim 'admin'
    console.log('Definindo claim customizada { admin: true }...');
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log(`Usuário ${email} agora possui a claim admin=true (uid=${userRecord.uid}).`);

    console.log('\nPronto. Agora você pode usar esse usuário para acessar a área administrativa do app.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar/atualizar usuário admin:', error);
    process.exit(1);
  }
}

main();
