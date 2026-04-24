import React from "react";
import { Card, PageWrapper } from "../components/AppPrimitives";

export default function PaginaTermos() {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-800 dark:text-white mb-6">Termos de Serviço</h1>
            <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 space-y-4">
              <p><strong>Última atualização: 16 de setembro de 2025</strong></p>
              <p>Por favor, leia estes Termos de Serviço ("Termos") cuidadosamente antes de usar o site itajobicars.com (o "Serviço") operado pelo Itajobi Cars Club.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">1. Contas</h2>
              <p>Ao criar uma conta conosco, você deve nos fornecer informações precisas, completas e atuais em todos os momentos. A falha em fazer isso constitui uma violação dos Termos, o que pode resultar na rescisão imediata da sua conta em nosso Serviço.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">2. Inscrições</h2>
              <p>Se você deseja comprar qualquer produto ou serviço disponibilizado através do Serviço ("Compra"), pode ser solicitado que você forneça certas informações relevantes para a sua Compra, incluindo, sem limitação, seu nome, CPF e informações de pagamento.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">3. Propriedade Intelectual</h2>
              <p>O Serviço e seu conteúdo original, recursos e funcionalidades são e permanecerão propriedade exclusiva da ITAJOBICARSCLUB e de seus licenciadores. O Serviço é protegido por direitos autorais, marcas registradas e outras leis do Brasil e de outros países.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">4. Links Para Outros Sites</h2>
              <p>Nosso Serviço pode conter links para sites ou serviços de terceiros que não são de propriedade ou controlados pela ITAJOBICARSCLUB. Não temos controle e não assumimos responsabilidade pelo conteúdo, políticas de privacidade ou práticas de quaisquer sites ou serviços de terceiros.</p>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

