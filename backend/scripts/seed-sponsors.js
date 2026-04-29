/**
 * Script: seed-sponsors.js
 * Popula a coleção 'sponsors' no Firestore com os patrocinadores
 * que já existem no site (hardcodados no footer).
 *
 * Uso:
 *   cd backend
 *   node scripts/seed-sponsors.js
 */

const admin = require("../config/firebaseAdmin");
const db = admin.firestore();

const sponsors = [
  {
    name: "ART METAL",
    category: "Patrocinador",
    logoUrl: "/assets/prc1.png",
    website: "",
    phone: "",
    instagram: "",
    facebook: "",
    description: "Serralheria Art Metal — parceiro oficial do Itajobi Cars Club.",
  },
  {
    name: "Bar do Pico",
    category: "Parceiro",
    logoUrl: "/assets/prc2.png",
    website: "",
    phone: "17 3546-2948",
    instagram: "",
    facebook: "",
    description: "Bar do Pico — apoiador dos eventos do clube.",
  },
  {
    name: "ITAJOBI CARS CLUB",
    category: "Patrocinador Master",
    logoUrl: "/assets/prc3.png",
    website: "",
    phone: "17996133907",
    instagram: "itajobicarsclub",
    facebook: "",
    description: "O próprio clube, organizador de todos os eventos.",
  },
];

async function seed() {
  console.log("🌱 Iniciando seed de patrocinadores...\n");

  // Verifica se já existem documentos
  const existing = await db.collection("sponsors").limit(1).get();
  if (!existing.empty) {
    console.log("⚠️  Coleção 'sponsors' já possui documentos. Abortando para evitar duplicatas.");
    console.log("   Se quiser forçar, exclua os documentos existentes no Firestore Console e rode novamente.");
    process.exit(0);
  }

  for (const sponsor of sponsors) {
    const docRef = await db.collection("sponsors").add({
      ...sponsor,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`✅ Adicionado: ${sponsor.name} (ID: ${docRef.id})`);
  }

  console.log("\n🎉 Seed concluído! Atualize o logoUrl de cada parceiro pelo painel admin.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erro durante o seed:", err);
  process.exit(1);
});
