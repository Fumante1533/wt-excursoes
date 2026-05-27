import React, { useEffect, useState } from "react";
import { Calendar, Car, CheckCircle, Clock, Download, ShieldCheck, XCircle } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "react-hot-toast";
import { Button, Card, PageWrapper, Spinner } from "../components/AppPrimitives";
import { formatValidationDate, getTicketQrValue } from "../utils/ticket";

export default function PaginaIngresso({ ticketCode, ticketToken, onNavigate }) {
  const [ticketData, setTicketData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTicket = async () => {
      setIsLoading(true);
      setError("");
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
        const qs = ticketToken ? `?s=${encodeURIComponent(ticketToken)}` : "";
        const response = await fetch(`${backendUrl}/api/payment/ticket/${encodeURIComponent(ticketCode || "")}${qs}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Ingresso nao encontrado.");
        setTicketData(data);
      } catch (err) {
        setError(err.message || "Nao foi possivel carregar este ingresso.");
      } finally {
        setIsLoading(false);
      }
    };

    if (ticketCode) loadTicket();
  }, [ticketCode, ticketToken]);

  const downloadTicket = async () => {
    const element = document.getElementById("public-ticket-card");
    if (!element) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#18181b" });
      const link = document.createElement("a");
      link.download = `ingresso-${ticketData?.ticket?.code || ticketCode}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Ingresso salvo.");
    } catch (err) {
      console.error("Erro ao salvar ingresso:", err);
      toast.error("Nao foi possivel salvar o ingresso.");
    }
  };

  const ticket = ticketData?.ticket || {};
  const qrValue = getTicketQrValue(ticket) || window.location.href;
  const validatedAt = formatValidationDate(ticket.validatedAt);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16 px-4">
        <div className="max-w-xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <XCircle className="mx-auto text-red-500 mb-4" size={64} />
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Ingresso indisponivel</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6">{error}</p>
              <Button onClick={() => onNavigate("home")} variant="secondary">Voltar ao site</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card id="public-ticket-card" className="p-6 bg-zinc-900 border-zinc-800 text-white overflow-hidden">
                <div className="flex items-start justify-between gap-4 border-b border-dashed border-zinc-700 pb-5 mb-5">
                  <div>
                    <p className="text-yellow-400 font-semibold text-sm flex items-center gap-2">
                      <ShieldCheck size={16} /> Ingresso oficial
                    </p>
                    <h1 className="text-2xl font-bold mt-1">{ticketData.eventoName || "Evento"}</h1>
                    <p className="text-zinc-400 text-sm">{ticketData.ticketType || "Ingresso"}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.validated ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                    {ticket.validated ? "Validado" : "Pendente"}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm mb-5">
                  <div>
                    <span className="text-zinc-500 block">Participante</span>
                    <span className="font-semibold">{ticketData.buyerName || "Participante"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Codigo</span>
                    <span className="font-mono font-bold">{ticket.code || ticketCode}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Calendar size={16} className="text-yellow-400" />
                    {ticketData.eventoDate ? new Date(ticketData.eventoDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Data do evento"}
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Car size={16} className="text-yellow-400" />
                    {ticketData.carInfo?.plate ? `${ticketData.carInfo.model || ""} ${ticketData.carInfo.plate}` : "Veiculo nao informado"}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 pt-5 border-t border-zinc-800">
                  <div className="bg-white p-3 rounded-xl">
                    <QRCodeCanvas value={qrValue} size={180} includeMargin />
                  </div>
                  <p className="text-xs text-zinc-400 text-center max-w-sm">
                    A portaria deve escanear este QR Code. Ele inclui uma assinatura de seguranca do ingresso.
                  </p>
                </div>

                {ticket.validated && (
                  <div className="mt-5 p-3 rounded-lg bg-emerald-500/10 text-emerald-200 text-sm flex items-center gap-2">
                    <CheckCircle size={16} />
                    Entrada validada{validatedAt ? ` em ${validatedAt}` : ""}.
                  </div>
                )}
                {!ticket.validated && (
                  <div className="mt-5 p-3 rounded-lg bg-yellow-500/10 text-yellow-200 text-sm flex items-center gap-2">
                    <Clock size={16} />
                    Aguardando validacao na portaria.
                  </div>
                )}
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={downloadTicket} className="flex-1">
                  <Download size={16} className="mr-2" /> Salvar ingresso
                </Button>
                <Button onClick={() => onNavigate("eventsHub")} variant="secondary" className="flex-1">
                  Ver eventos
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
