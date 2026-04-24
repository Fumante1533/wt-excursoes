import React from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { Card, Button, PageWrapper } from "../components/AppPrimitives";

export default function PaginaStatusPagamento({ onNavigate, status }) {
  const isSuccess = status === "success";
  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-center px-4 pt-20">
        <Card className="p-8 md:p-12 max-w-lg w-full">
          {isSuccess ? (
            <CheckCircle className="mx-auto text-green-500 mb-6" size={80} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-6" size={80} />
          )}
          <h1
            className={`text-3xl font-bold mb-4 ${isSuccess ? "text-zinc-800 dark:text-white" : "text-red-700"}`}
          >
            {isSuccess ? "Pagamento Aprovado!" : "Pagamento Falhou"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 mb-8">
            {isSuccess
              ? "Parabéns! Sua compra foi confirmada. Enviamos todos os detalhes para o seu email."
              : "Houve um problema ao processar seu pagamento. Por favor, tente novamente ou contate o suporte."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => onNavigate("home")}>Voltar para o Início</Button>
            {isSuccess && (
              <Button onClick={() => onNavigate("account")} variant="secondary">
                Ver Minhas Inscrições
              </Button>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
