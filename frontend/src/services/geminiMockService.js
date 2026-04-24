export const callGeminiAPI = async (prompt) => {
  console.log("Chamando API Gemini com o prompt:", prompt);
  return new Promise((resolve) => {
    setTimeout(() => {
      let response = "Desculpe, não consegui gerar uma resposta. Tente novamente.";
      if (prompt.includes("Sugestões de preparação")) {
        response = `### Guia de Preparação para o Track Day (Foco: Performance e Segurança)\n\n**1. Verificação Essencial do Veículo:**\n- **Pneus:** Calibre os pneus (um pouco acima do recomendado para rua) e verifique o desgaste. Pneus em bom estado são cruciais.\n- **Freios:** Inspecione pastilhas e fluido de freio. A pista exige muito dos freios.\n- **Fluidos:** Verifique o nível de óleo do motor e líquido de arrefecimento. Complete se necessário.\n- **Interior:** Remova todos os objetos soltos do interior do carro (tapetes, garrafas, etc.) para evitar que se movam durante a pilotagem.\n\n**2. Equipamentos do Piloto:**\n- **Capacete:** Item obrigatório. Certifique-se de que está homologado e bem ajustado.\n- **Vestimenta:** Use calças compridas, camiseta de algodão e calçados fechados e firmes (tênis é ideal).\n- **Luvas (Opcional):** Podem melhorar a aderência e o conforto ao volante.\n\n**3. No Dia do Evento:**\n- **Briefing:** Preste muita atenção ao briefing de segurança dos organizadores. Conheça as regras da pista e o significado das bandeiras.\n- **Hidratação:** Leve bastante água. Pilotar é uma atividade física que desidrata.\n- **Comece com Calma:** Use as primeiras voltas para aquecer os pneus e se familiarizar com o traçado da pista. Aumente o ritmo gradualmente.`;
      } else if (prompt.includes("Gerar descrição")) {
        response =
          "Prepare-se para um dia de pura adrenalina e paixão por velocidade no nosso Track Day em Interlagos! Leve seu carro para o limite em um dos circuitos mais icônicos do mundo, com toda a segurança e estrutura que o Itajobi Cars Club oferece. O evento conta com cronometragem profissional, instrutores à disposição e suporte técnico. Ideal para pilotos amadores e experientes que desejam aprimorar suas habilidades e extrair o máximo de performance de suas máquinas. As vagas são limitadas para garantir tempo de pista de qualidade para todos. Inscreva-se agora e faça parte desta experiência inesquecível!";
      }
      resolve(response);
    }, 1500);
  });
};

