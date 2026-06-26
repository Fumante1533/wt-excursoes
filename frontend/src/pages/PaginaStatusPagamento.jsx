import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Download } from "lucide-react";
import { collection, query, orderBy, limit, getDocs, collectionGroup, where } from "firebase/firestore";
import { Card, Button, PageWrapper, Spinner } from "../components/AppPrimitives";
import { db } from "../firebaseConfig";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "react-hot-toast";
import { getTicketQrValue } from "../utils/ticket";

export default function PaginaStatusPagamento({ onNavigate, status, user }) {
  const isSuccess = status === "success";
  const isPending = status === "pending";
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(isSuccess);

  const downloadTicket = async () => {
    const element = document.getElementById("ticket-preview");
    if (!element) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#18181b" });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ingresso-${lastOrder?.id || "confirmado"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Ingresso baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar imagem do ingresso:", err);
      toast.error("Não foi possível gerar o ingresso.");
    }
  };

  useEffect(() => {
    if (!isSuccess) {
      setLoading(false);
      return;
    }
    // Busca o pedido pelo payment_id / preference_id da URL ou pelo usuário logado
    const fetchOrder = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get("payment_id") || urlParams.get("paymentId");
        const preferenceId = urlParams.get("preference_id") || urlParams.get("preferenceId");

        // 1. Tenta buscar pelo ID de pagamento
        if (paymentId) {
          const qStr = query(collectionGroup(db, "orders"), where("paymentId", "==", String(paymentId)));
          const snapStr = await getDocs(qStr);
          if (!snapStr.empty) {
            setLastOrder({ id: snapStr.docs[0].id, ...snapStr.docs[0].data() });
            return;
          }
          const qNum = query(collectionGroup(db, "orders"), where("paymentId", "==", Number(paymentId)));
          const snapNum = await getDocs(qNum);
          if (!snapNum.empty) {
            setLastOrder({ id: snapNum.docs[0].id, ...snapNum.docs[0].data() });
            return;
          }
        }

        // 2. Tenta buscar pelo ID de preferência
        if (preferenceId) {
          const qPref = query(collectionGroup(db, "orders"), where("preferenceId", "==", String(preferenceId)));
          const snapPref = await getDocs(qPref);
          if (!snapPref.empty) {
            setLastOrder({ id: snapPref.docs[0].id, ...snapPref.docs[0].data() });
            return;
          }
        }

        // 3. Fallback para usuário autenticado
        if (user?.uid) {
          const ordersRef = collection(db, "users", user.uid, "orders");
          const q = query(ordersRef, orderBy("purchaseDate", "desc"), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setLastOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
            return;
          }
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
              ? "Seu pagamento foi aprovado. O ingresso com QR Code fica disponível aqui e também será enviado para o e-mail informado na compra."
              : isPending
              ? "Seu pagamento está sendo processado. Assim que for confirmado, o ingresso ficará disponível no site e será enviado por e-mail."
              : "Houve um problema ao processar seu pagamento. Tente novamente ou entre em contato com o suporte."}
          </p>

          {/* Detalhes do pedido (somente no sucesso) */}
          {isSuccess && (
            <div className="mb-8">
              {loading ? (
                <div className="flex justify-center py-4"><Spinner /></div>
              ) : lastOrder ? (
                <div className="space-y-4">
                  <div 
                    id="ticket-preview" 
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left space-y-4 shadow-xl relative overflow-hidden"
                  >
                    {/* Decorative notches for ticket effect */}
                    <div className="absolute top-1/2 -left-3 w-6 h-6 bg-zinc-50 dark:bg-zinc-950 rounded-full border-r border-zinc-800" />
                    <div className="absolute top-1/2 -right-3 w-6 h-6 bg-zinc-50 dark:bg-zinc-950 rounded-full border-l border-zinc-800" />
                    
                    <div className="flex justify-between items-center border-b border-dashed border-zinc-800 pb-4">
                      <div>
                        <h2 className="font-extrabold text-white text-xl tracking-tight">
                          {lastOrder.eventoName || "Evento"}
                        </h2>
                        <p className="text-sm text-yellow-400 font-semibold">{lastOrder.ticketType || "Ingresso"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest block">Código</span>
                        <span className="font-mono font-bold text-white text-lg tracking-wider">
                          {lastOrder.ticket?.code || "Pendente"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
                      <div>
                        <span className="text-xs text-zinc-500 block">Participante</span>
                        <span className="font-medium text-white">{lastOrder.buyerName || "Visitante"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500 block">Carro</span>
                        <span className="font-medium text-white">
                          {lastOrder.carInfo?.model ? `${lastOrder.carInfo.model} (${lastOrder.carInfo.plate})` : "Não cadastrado"}
                        </span>
                      </div>
                    </div>

                    {lastOrder.ticket?.code && (
                      <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center gap-4">
                        <div className="bg-white p-2 rounded-xl shrink-0">
                          <QRCodeCanvas value={getTicketQrValue(lastOrder.ticket)} size={110} includeMargin />
                        </div>
                        <div className="text-xs text-zinc-400 space-y-1">
                          <p className="font-semibold text-zinc-200">Acelere com a gente!</p>
                          <p>Apresente este QR Code na portaria do evento para validação.</p>
                          <p className="text-yellow-400/90 font-medium">Você também pode acessar este ingresso pelo e-mail da compra.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {lastOrder.ticket?.code && (
                    <div className="flex justify-center">
                      <Button onClick={downloadTicket} variant="secondary" size="sm" className="w-full">
                        <Download size={16} className="mr-2 inline" /> Salvar Ingresso no Celular
                      </Button>
                    </div>
                  )}
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
