const admin = require('../config/firebaseAdmin');

const initialBlogPosts = [
  {
    id: "blog-4-encontro-clube",
    title: "4º Encontro Itajobi Cars Club: veja como vai ser",
    author: "Itajobi Cars Club",
    imageUrl: "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?q=80&w=2070&auto=format&fit=crop",
    summary: "Programação completa, dicas para chegar cedo e o que não pode faltar no seu encontro.",
    content: "Nosso 4º Encontro do Itajobi Cars Club vai ser especial para quem quer viver a cultura automotiva.\n\nNeste encontro, vamos ter:\n- Exposição e área de fotos\n- Encontro de membros\n- Sorteios e brindes do clube\n\nComo chegar:\nChegue com antecedência para garantir vaga e credenciamento rápido.\n\nEsperamos você para acelerar com a nossa comunidade!",
    createdAt: new Date("2026-03-01T12:00:00.000Z")
  },
  {
    id: "blog-primeira-vez",
    title: "Primeira vez no clube? Um guia rápido",
    author: "Comunidade Itajobi",
    imageUrl: "https://images.unsplash.com/photo-1517940311010-7e6f8f2b3d7b?q=80&w=2070&auto=format&fit=crop",
    summary: "O que levar, como funciona a inscrição e como aproveitar ao máximo o evento.",
    content: "Se você vai pela primeira vez, aqui vai um guia rápido:\n\n1) Inscreva-se com antecedência\n2) Separe documento e dados do comprador\n3) Chegue cedo para credenciamento\n4) Traga seu carro com calma e participe das fotos\n\nA gente faz questão de receber todo mundo com respeito e segurança. Nos vemos no encontro!",
    createdAt: new Date("2026-02-20T12:00:00.000Z")
  }
];

async function importBlog() {
  const db = admin.firestore();
  try {
    for (const post of initialBlogPosts) {
      const { id, ...data } = post;
      await db.collection('blogPosts').doc(id).set(data);
      console.log(`Importado post: ${data.title}`);
    }
    console.log('Importação do blog concluída!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

importBlog();
