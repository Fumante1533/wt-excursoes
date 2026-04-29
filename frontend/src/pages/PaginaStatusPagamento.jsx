import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Ticket, Calendar, User } from "lucide-react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Card, Button, PageWrapper, Spinner } from "../components/AppPrimitives";
import { db } from "../firebaseConfig";

export default function PaginaStatusPagamento({ onNavigate, status, user }) {
  const isSuccess = status === "success";
  const isPending = status === "pending";
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(isSuccess);

  useEffect(() => {
    if (!isSuccess || !user?.uid) {
      setLoading(false);
      return;
    }
    // Busca o pedido mais recente do usuário
    const fetchOrder = async () => {
      try {
        const ordersRef = collection(db, "users", user.uid, "orders");
        const q = query(ordersRef, orderBy("purchaseDate", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setLastOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (e) {
        console.warn("Não foi possível carregar o pedido:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [isSuccess, user]);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-center px-4 pt-20">
        <Card className="p-8 md:p-12 max-w-lg w-full">

          {/* Ícone de status */}
          {isSuccess ? (
            <CheckCircle className="mx-auto text-green-500 mb-6" size={80} />
          ) : isPending ? (
            <Clock className="mx-auto text-yellow-500 mb-6" size={80} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-6" size={80} />
          )}

          {/* Título */}
          <h1 className={`text-3xl font-bold mb-2 ${
            isSuccess
              ? "text-zinc-800 dark:text-white"
              : isPending
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-red-600"
          }`}>
            {isSuccess
              ? "Inscrição Confirmada! 🎉"
              : isPending
              ? "Aguardando Pagamento"
              : "Pagamento Não Aprovado"}
          </h1>

          {/* Descrição */}
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            {isSuccess
              ? "Seu pagamento foi aprovado. Enviamos os detalhes para o seu e-mail."
              : isPending
              ? "Seu pagamento está sendo processado. Assim que for confirmado, você receberá o ingresso por e-mail."
              : "Houve um problema ao processar seu pagamento. Tente novamente ou entre em contato com o suporte."}
          </p>

          {/* Detalhes do pedido (somente no sucesso) */}
          {isSuccess && (
            <div className="mb-8">
              {loading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : lastOrder ? (
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-5 text-left space-y-3">
                  <h2 className="font-bold text-zinc-800 dark:text-white text-lg border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-3">
                    Detalhes da Inscrição
                  </h2>
                  <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
                    <Calendar size={18} className="text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">{lastOrder.eventoName || "Evento"}</p>
                      {lastOrder.ticketType && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{lastOrder.ticketType}</p>
                      )}
                    </div>
                  </div>
                  {lastOrder.ticket?.code && (
                    <div className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300">
                      <Ticket size={18} className="text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Código do Ingresso</p>
                        <p className="font-mono font-bold text-lg tracking-widest">{lastOrder.ticket.code}</p>
                      </div>
                    </div>
                  )}
                  {lastOrder.price > 0 && (
                    <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                      <span className="text-yellow-500 text-lg font-bold">R$</span>
                      <div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Total Pago</p>
                        <p className="font-bold text-green-600 dark:text-green-400">
                          R$ {Number(lastOrder.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                  {lastOrder.buyerName && (
                    <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                      <User size={18} className="text-yellow-500 shrink-0" />
                      <p className="text-sm">{lastOrder.buyerName}</p>
                    </div>
                  )}
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                    Apresente este código na entrada do evento. Você também pode encontrá-lo em "Minhas Inscrições".
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => onNavigate("home")} variant="secondary">
              Voltar para o Início
            </Button>
            {(isSuccess || isPending) && (
              <Button onClick={() => onNavigate("account")}>
                Minhas Inscrições
              </Button>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
