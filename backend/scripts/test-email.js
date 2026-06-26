/**
 * Script para testar envio de email.
 * Rode na VPS: node scripts/test-email.js seu-email@gmail.com
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

const destinatario = process.argv[2];

if (!destinatario) {
  console.error('Uso: node scripts/test-email.js seu-email@gmail.com');
  process.exit(1);
}

console.log('--- Verificando configuração de email ---');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? `${process.env.EMAIL_USER.slice(0, 4)}...` : 'NÃO DEFINIDO ❌');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '******** (definido ✅)' : 'NÃO DEFINIDO ❌');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('\n❌ EMAIL_USER ou EMAIL_PASS não estão definidos no .env');
  console.error('Configure essas variáveis antes de testar.');
  process.exit(1);
}

async function testar() {
  console.log(`\nEnviando email de teste para: ${destinatario}`);
  console.log(`Usando remetente: ${process.env.EMAIL_USER}`);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Testa a conexão SMTP antes de enviar
    console.log('\n1. Testando conexão SMTP...');
    await transporter.verify();
    console.log('   ✅ Conexão SMTP OK!');

    console.log('2. Enviando email de teste...');
    const info = await transporter.sendMail({
      from: `"Itajobi Cars Club" <${process.env.EMAIL_USER}>`,
      to: destinatario,
      subject: '🧪 Teste de Email - Itajobi Cars Club',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; color: #333; padding: 20px;">
          <h2 style="color: #eab308;">✅ Email funcionando!</h2>
          <p>Este é um email de teste enviado pelo sistema do Itajobi Cars Club.</p>
          <p>Se você está vendo isso, o envio de emails está funcionando corretamente.</p>
          <div style="margin: 20px auto; padding: 15px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
            </p>
          </div>
        </div>
      `,
    });

    console.log('   ✅ Email enviado com sucesso!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n🎉 Verifique a caixa de entrada de: ${destinatario}`);
    console.log('   (confira também a pasta Spam)');
  } catch (err) {
    console.error('\n❌ ERRO ao enviar email:', err.message);

    if (err.message.includes('Invalid login') || err.message.includes('Username and Password not accepted')) {
      console.error('\n📋 Possíveis causas:');
      console.error('   1. EMAIL_PASS precisa ser uma "Senha de app" do Google, não a senha normal');
      console.error('   2. Acesse: https://myaccount.google.com/apppasswords');
      console.error('   3. Crie uma senha de app e use ela no EMAIL_PASS');
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      console.error('\n📋 Possíveis causas:');
      console.error('   1. Firewall da VPS bloqueando porta 465/587');
      console.error('   2. Provedor bloqueando conexão SMTP');
    }

    process.exit(1);
  }
}

testar();
