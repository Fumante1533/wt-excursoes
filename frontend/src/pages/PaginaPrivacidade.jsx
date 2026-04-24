import React from "react";
import { Card, PageWrapper } from "../components/AppPrimitives";

export default function PaginaPrivacidade() {
  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-800 dark:text-white mb-6">Política de Privacidade</h1>
            <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 space-y-4">
              <p><strong>Última atualização: 16 de setembro de 2025</strong></p>
              <p>O Itajobi Cars Club ("nós", "nosso") opera o site itajobicars.com (o "Serviço"). Esta página informa sobre nossas políticas em relação à coleta, uso e divulgação de informações pessoais quando você usa nosso Serviço.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">1. Coleta e Uso de Informações</h2>
              <p>Coletamos vários tipos diferentes de informações para diversos fins, a fim de fornecer e melhorar nosso Serviço para você. Ao se registrar, solicitamos informações como seu nome completo, CPF, data de nascimento e endereço de e-mail.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">2. Dados de Uso</h2>
              <p>Podemos também coletar informações sobre como o Serviço é acessado e usado ("Dados de Uso"). Estes Dados de Uso podem incluir informações como o endereço de Protocolo de Internet do seu computador (por exemplo, endereço IP), tipo de navegador, versão do navegador, as páginas do nosso Serviço que você visita, a hora e a data da sua visita, o tempo gasto nessas páginas e outros dados de diagnóstico.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">3. Segurança dos Dados</h2>
              <p>A segurança dos seus dados é importante para nós, mas lembre-se que nenhum método de transmissão pela Internet ou método de armazenamento eletrônico é 100% seguro. Embora nos esforcemos para usar meios comercialmente aceitáveis para proteger suas Informações Pessoais, não podemos garantir sua segurança absoluta.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">4. Alterações a Esta Política de Privacidade</h2>
              <p>Podemos atualizar nossa Política de Privacidade de tempos em tempos. Notificaremos você sobre quaisquer alterações, publicando a nova Política de Privacidade nesta página. Aconselhamos que você revise esta Política de Privacidade periodicamente para quaisquer alterações.</p>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

