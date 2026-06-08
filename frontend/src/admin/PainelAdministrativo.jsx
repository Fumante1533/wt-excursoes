import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Package,
  Users,
  BarChart2,
  Plus,
  LogOut,
  Edit,
  Trash2,
  UserCircle2,
  Tag,
  Ticket,
  FileText,
  Menu,
  X,
  Download,
  Mail,
  UserCheck,
  Eye,
  Copy,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { BrowserMultiFormatReader } from "@zxing/browser";
import UserManagement from "./UserManagement";
import CouponManagement from "./CouponManagement";
import BlogManagement from "./BlogManagement";
import SponsorManagement from "./SponsorManagement";
import ActivityLogsView from "./ActivityLogsView";
import EmissaoIngressoManual from "./EmissaoIngressoManual";
import { Button } from "../components/AppPrimitives";
import CaixaDialogo from "../components/CaixaDialogo";
import FormularioEvento from "./FormularioEvento";
import { formatValidationDate, getTicketQrValue } from "../utils/ticket";
import { withUploadCacheBust } from "../utils/imageUrl";

function TabelaEventoAdmin({ eventos, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-bold text-white mb-6">Gerenciar Eventos</h2>
      <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left text-zinc-300 min-w-[600px]">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-700">
              <th className="p-4">Evento</th>
              <th className="p-4">Local</th>
              <th className="p-4">Data</th>
              <th className="p-4">Ingressos</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((ex) => (
              <tr key={ex.id} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/50">
                <td className="p-4 font-semibold flex items-center">
                  <img src={withUploadCacheBust(ex.image)} alt={ex.name} className="w-12 h-12 object-cover rounded-md mr-4" />
                  <span className="text-white">{ex.name}</span>
                </td>
                <td className="p-4">{ex.location}</td>
                <td className="p-4">
                  {new Date(ex.date).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                  {ex.time && <span className="block text-zinc-400 text-sm mt-1">{ex.time} {ex.timeEnd && `às ${ex.timeEnd}`}</span>}
                </td>
                <td className="p-4">{ex.tickets.length}</td>
                <td className="p-4 flex gap-2">
                  <button
                    onClick={() => onEdit(ex)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 rounded-full transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(ex)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ListaPedidosAdmin({ orders }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedPresence, setSelectedPresence] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const uniqueEvents = Array.from(new Set(orders.map(o => o.eventoName).filter(Boolean)));
  const getPaymentLabel = (order) => order.paymentMethod || (order.isManual ? "manual" : order.preferenceId ? "mercadopago" : "online");
  const uniquePayments = Array.from(new Set(orders.map(getPaymentLabel).filter(Boolean)));

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.buyerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.buyerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.carInfo?.plate || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.carInfo?.model || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.ticket?.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(order.paymentId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPaymentLabel(order).toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesEvent = selectedEvent === "" || order.eventoName === selectedEvent;
    const matchesStatus = selectedStatus === "" || order.status === selectedStatus;
    const matchesPresence =
      selectedPresence === "" ||
      (selectedPresence === "validated" && order.ticket?.validated) ||
      (selectedPresence === "pending" && !order.ticket?.validated);
    const matchesPayment = selectedPayment === "" || getPaymentLabel(order) === selectedPayment;
    
    return matchesSearch && matchesEvent && matchesStatus && matchesPresence && matchesPayment;
  });
  const paidCount = filteredOrders.filter((order) => order.status === "Pago").length;
  const validatedCount = filteredOrders.filter((order) => order.ticket?.validated).length;
  const manualCount = filteredOrders.filter((order) => order.isManual || getPaymentLabel(order) === "manual").length;

  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Evento", "Tipo de Ingresso", "Status", "Preço", "Placa do Carro", "Modelo do Carro", "Código Ingresso"];
    const rows = filteredOrders.map(order => [
      `"${order.buyerName || ""}"`,
      `"${order.buyerEmail || ""}"`,
      `"${order.eventoName || ""}"`,
      `"${order.ticketType || ""}"`,
      `"${order.status || ""}"`,
      order.price || 0,
      `"${order.carInfo?.plate || ""}"`,
      `"${order.carInfo?.model || ""}"`,
      `"${order.ticket?.code || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lista_presenca_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printList = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const rowsHtml = filteredOrders.map(o => `
      <tr>
        <td>${o.buyerName || "—"}</td>
        <td>${o.buyerEmail || "—"}</td>
        <td>${o.eventoName || "—"}</td>
        <td>${o.ticketType || "—"}</td>
        <td>${o.carInfo?.plate || "—"} ${o.carInfo?.model ? `(${o.carInfo.model})` : ""}</td>
        <td>${o.ticket?.code || "—"}</td>
        <td>${o.status || "—"}</td>
        <td>${o.ticket?.validated ? "Validado" : "Pendente"}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Portaria - Itajobi Cars Club</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 24px; }
            p.meta { text-align: center; color: #666; font-size: 14px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Portaria - Lista de Presença</h1>
          <p class="meta">Gerado em ${new Date().toLocaleString("pt-BR")} | Total de ingressos: ${filteredOrders.length}</p>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Evento</th>
                <th>Ingresso</th>
                <th>Veículo</th>
                <th>Código</th>
                <th>Pagamento</th>
                <th>Portaria</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleResendEmail = async (orderId) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      
      const response = await fetch(`${backendUrl}/api/user/resend-ticket`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ orderId })
      });
      
      if (!response.ok) throw new Error("Erro ao reenviar ingresso");
      toast.success("Ingresso reenviado com sucesso!");
    } catch (err) {
      toast.error("Falha ao reenviar o ingresso.");
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Lista de Compradores</h2>
          <p className="text-sm text-zinc-400 mt-1">
            {filteredOrders.length} ingressos filtrados, {paidCount} pagos, {validatedCount} validados, {manualCount} manuais.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={printList}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold transition-colors flex items-center justify-center text-sm"
          >
            <FileText size={18} className="mr-2" /> Imprimir Portaria (PDF)
          </button>
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md font-semibold transition-colors flex items-center justify-center text-sm"
          >
            <Download size={18} className="mr-2" /> Exportar Planilha
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar por nome, e-mail, placa, modelo ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-zinc-700 text-white border border-zinc-650 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm md:col-span-2"
        />
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="bg-zinc-700 text-white border border-zinc-650 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
        >
          <option value="">Todos os Eventos</option>
          {uniqueEvents.map((evt, idx) => (
            <option key={idx} value={evt}>{evt}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-zinc-700 text-white border border-zinc-650 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
        >
          <option value="">Todos os Status</option>
          <option value="Pago">Pago</option>
          <option value="Pendente">Pendente</option>
        </select>
        <select
          value={selectedPresence}
          onChange={(e) => setSelectedPresence(e.target.value)}
          className="bg-zinc-700 text-white border border-zinc-650 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
        >
          <option value="">Portaria</option>
          <option value="validated">Validados</option>
          <option value="pending">Nao validados</option>
        </select>
        <select
          value={selectedPayment}
          onChange={(e) => setSelectedPayment(e.target.value)}
          className="bg-zinc-700 text-white border border-zinc-650 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
        >
          <option value="">Pagamento</option>
          {uniquePayments.map((method) => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>
      </div>

      <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left text-zinc-300 min-w-[860px]">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-700">
              <th className="p-4">Comprador</th>
              <th className="p-4">Evento</th>
              <th className="p-4">Ingresso</th>
              <th className="p-4">Veículo</th>
              <th className="p-4">Status</th>
              <th className="p-4">Portaria</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order, index) => (
              <tr key={index} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/50">
                <td className="p-4">
                  <p className="font-semibold text-white">{order.buyerName}</p>
                  <p className="text-sm text-zinc-400">{order.buyerEmail}</p>
                </td>
                <td className="p-4">{order.eventoName}</td>
                <td className="p-4">{order.ticketType}</td>
                <td className="p-4 font-mono">
                  {order.carInfo?.plate ? (
                    <div>
                      <span className="font-semibold text-white">{order.carInfo.plate}</span>
                      <span className="block text-xs text-zinc-400 font-sans">{order.carInfo.model || ""}</span>
                    </div>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === "Pago" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {order.status}
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">{getPaymentLabel(order)}</p>
                </td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.ticket?.validated ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-600/40 text-zinc-300"
                    }`}
                  >
                    {order.ticket?.validated ? "Validado" : "Pendente"}
                  </span>
                  {order.ticket?.validatedAt && (
                    <p className="text-xs text-zinc-500 mt-1">{formatValidationDate(order.ticket.validatedAt)}</p>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      title="Detalhes"
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 rounded transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      title="Copiar QR seguro"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(getTicketQrValue(order.ticket) || order.ticket?.code || "");
                          toast.success("Codigo copiado.");
                        } catch {
                          toast.error("Nao foi possivel copiar.");
                        }
                      }}
                      className="p-2 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 rounded transition-colors"
                    >
                      <Copy size={16} />
                    </button>
                  <button
                    title="Reenviar E-mail"
                    onClick={() => handleResendEmail(order.id)}
                    className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded transition-colors"
                  >
                    <Mail size={16} />
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CaixaDialogo isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Detalhes do ingresso">
        {selectedOrder && (
          <div className="space-y-4 text-zinc-200">
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <p><span className="text-zinc-500">Comprador:</span> {selectedOrder.buyerName || "-"}</p>
              <p><span className="text-zinc-500">Email:</span> {selectedOrder.buyerEmail || "-"}</p>
              <p><span className="text-zinc-500">Evento:</span> {selectedOrder.eventoName || "-"}</p>
              <p><span className="text-zinc-500">Ingresso:</span> {selectedOrder.ticketType || "-"}</p>
              <p><span className="text-zinc-500">Pedido:</span> <span className="font-mono">{selectedOrder.id}</span></p>
              <p><span className="text-zinc-500">Pagamento:</span> {getPaymentLabel(selectedOrder)}</p>
              <p><span className="text-zinc-500">Codigo:</span> <span className="font-mono">{selectedOrder.ticket?.code || "-"}</span></p>
              <p><span className="text-zinc-500">Veiculo:</span> {selectedOrder.carInfo?.plate ? `${selectedOrder.carInfo.model || ""} ${selectedOrder.carInfo.plate}` : "-"}</p>
            </div>
            {getTicketQrValue(selectedOrder.ticket).startsWith("http") && (
              <Button type="button" variant="secondary" onClick={() => window.open(getTicketQrValue(selectedOrder.ticket), "_blank", "noopener,noreferrer")}>
                Abrir pagina do ingresso
              </Button>
            )}
            <div>
              <h3 className="font-bold text-white mb-2">Historico de validacao</h3>
              {selectedOrder.ticket?.validationHistory?.length ? (
                <div className="space-y-2">
                  {selectedOrder.ticket.validationHistory.map((item, index) => (
                    <div key={`${item.at}-${index}`} className="p-3 rounded-md bg-zinc-800 border border-zinc-700 text-sm">
                      <p>{formatValidationDate(item.at) || item.at}</p>
                      <p className="text-zinc-500">{item.byEmail || item.by || "Admin"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Ainda nao ha validacao registrada.</p>
              )}
            </div>
          </div>
        )}
      </CaixaDialogo>
    </motion.div>
  );
}

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.warn("AudioContext não suportado ou bloqueado:", e);
  }
}

function ValidadorIngressos({ eventos }) {
  const [ticketCode, setTicketCode] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const doValidate = async (codeParam) => {
    const code = String(codeParam !== undefined ? codeParam : ticketCode).trim();
    if (!code) { toast.error("Informe o código do ingresso."); return; }
    setIsValidating(true);
    setResult(null);
    setValidationError(null);
    let responseStatus = null;
    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      const user = auth?.currentUser;
      if (!user) { toast.error("Admin não autenticado."); setIsValidating(false); return; }
      const token = await user.getIdToken();
      const response = await fetch(`${backendUrl}/api/payment/validate-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticketCode: code, ...(eventoId ? { eventoId } : {}) }),
      });
      responseStatus = response.status;
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) {
          setValidationError(data);
        } else {
          setValidationError({ error: data.error || "Falha ao validar ingresso." });
        }
        throw new Error(data.error || "Falha ao validar ingresso.");
      }
      setResult(data);
      playSound("success");
      toast.success("Ingresso validado com sucesso!");
    } catch (err) {
      playSound("error");
      if (responseStatus !== 409) {
        setValidationError({ error: err.message || "Não foi possível validar." });
      }
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (!isScanning) return;
    setScanError("");
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    (async () => {
      try {
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          "ticket-video",
          (scanResult) => {
            if (stopped || !scanResult) return;
            const text = String(scanResult.getText() || "").trim();
            if (text) {
              stopped = true;
              setIsScanning(false);
              setTicketCode(text);
              doValidate(text);
            }
          }
        );
      } catch (scanErr) {
        console.warn("Falha ao iniciar leitor de QR:", scanErr);
        if (!stopped) setScanError("Não foi possível acessar a câmera. Verifique permissões.");
        setIsScanning(false);
      }
    })();
    return () => {
      stopped = true;
      try { reader.reset(); } catch { /* ignore */ }
    };
  }, [isScanning]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
      <h2 className="text-3xl font-bold text-white mb-6">Validação de Ingressos</h2>
      <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
        <Button variant="secondary" className="w-full" onClick={() => setIsScanning((v) => !v)}>
          {isScanning ? "⏹ Parar leitura" : "📷 Escanear QR Code"}
        </Button>
        {isScanning && (
          <div className="rounded-lg overflow-hidden border-2 border-yellow-500 bg-black relative">
            <video id="ticket-video" className="w-full h-[300px] object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-4 border-yellow-400 rounded-lg opacity-60" />
            </div>
            <p className="text-center text-yellow-400 text-sm py-2">Aponte para o QR Code do ingresso</p>
          </div>
        )}
        {scanError && <p className="text-red-300 text-sm">{scanError}</p>}
        <div className="text-zinc-400 text-xs text-center">— ou informe o código manualmente —</div>
        <input
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value)}
          placeholder="Código do ingresso (ex: ITC-...)"
          className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600 font-mono"
        />
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600"
        >
          <option value="">Validar em qualquer evento</option>
          {eventos.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{ex.name}</option>
          ))}
        </select>
        <Button onClick={() => doValidate()} disabled={isValidating} className="w-full">
          {isValidating ? "Validando..." : "✅ Validar ingresso"}
        </Button>

        {result && (
          <div className="p-6 rounded-xl bg-emerald-500/10 border-2 border-emerald-500 text-center transition-all duration-300">
            <p className="text-emerald-400 font-bold text-2xl mb-2">✅ INGRESSO VÁLIDO!</p>
            <p className="text-white font-bold text-lg">{result.buyerName || "—"}</p>
            <p className="text-zinc-300 text-sm mt-1">{result.eventoName || "—"}</p>
            {result.carInfo && (
              <div className="mt-3 py-2 px-4 bg-zinc-900/50 rounded-lg inline-block text-zinc-300 font-mono text-sm border border-zinc-700">
                🚗 {result.carInfo.model || result.carInfo.carModel} • <span className="font-bold text-yellow-400">{result.carInfo.plate || result.carInfo.carPlate}</span> • {result.carInfo.color || result.carInfo.carColor}
              </div>
            )}
            <p className="text-zinc-500 text-xs mt-3 font-mono">Código: {result.ticketCode}</p>
          </div>
        )}

        {validationError && (
          <div className="p-6 rounded-xl bg-red-500/10 border-2 border-red-500 text-center transition-all duration-300">
            <p className="text-red-400 font-bold text-2xl mb-2">❌ ENTRADA NEGADA!</p>
            <p className="text-white font-semibold text-lg">{validationError.error}</p>
            {validationError.buyerName && (
              <div className="mt-2 text-zinc-300 text-sm">
                <span className="font-bold text-white">Comprador:</span> {validationError.buyerName}
              </div>
            )}
            {validationError.eventoName && (
              <div className="text-zinc-400 text-xs mt-1">
                {validationError.eventoName}
              </div>
            )}
            {validationError.carInfo && (
              <div className="mt-3 py-2 px-4 bg-zinc-900/50 rounded-lg inline-block text-zinc-300 font-mono text-sm border border-zinc-700">
                🚗 {validationError.carInfo.model || validationError.carInfo.carModel} • <span className="font-bold text-red-400">{validationError.carInfo.plate || validationError.carInfo.carPlate}</span>
              </div>
            )}
            {validationError.ticket?.validatedAt && (
              <p className="text-zinc-500 text-xs mt-2">
                Validado em: {new Date(validationError.ticket.validatedAt._seconds * 1000 || validationError.ticket.validatedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function PainelAdministrativo({
  onNavigate,
  eventos,
  onAddEvento,
  onUpdateEvento,
  onDeleteEvento,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState(null);
  const [orders, setOrders] = useState([]);

  const handleEdit = (evento) => {
    setEditingEvento(evento);
    setActiveTab("addEvento");
  };

  const handleSaveEvento = (eventoData) => {
    if (editingEvento) {
      onUpdateEvento(eventoData);
    } else {
      onAddEvento(eventoData);
    }
    setEditingEvento(null);
    setActiveTab("eventos");
  };

  const openDeleteModal = (evento) => {
    if (!evento || !evento.id) {
      console.warn("openDeleteModal ignorado: objeto sem ID.");
      toast.error("Não foi possível carregar os detalhes do evento para deleção.");
      return;
    }
    setEventoToDelete({ id: evento.id, name: evento.name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (eventoToDelete && eventoToDelete.id) {
      onDeleteEvento(String(eventoToDelete.id));
    } else {
      console.warn("Tentativa de exclusão ignorada: eventoToDelete.id é nulo ou indefinido.");
      toast.error("Erro: ID do evento não encontrado. Tente recarregar.");
    }
    setShowDeleteModal(false);
    setEventoToDelete(null);
  };

  const fetchAllOrders = useCallback(async () => {
    try {
      if (!db) return;
      const getOrderTime = (order) => {
        const raw = order.purchaseDate || order.createdAt || "";
        if (raw?.toMillis) return raw.toMillis();
        if (raw?._seconds) return raw._seconds * 1000;
        const parsed = Date.parse(raw);
        return Number.isNaN(parsed) ? 0 : parsed;
      };
      let allOrders = [];
      try {
        const ordersSnapshot = await getDocs(collectionGroup(db, "orders"));
        allOrders = ordersSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          userId: docSnap.ref.parent.parent?.id || "",
          ...docSnap.data(),
        }));
      } catch (collectionGroupErr) {
        console.warn("Falha na busca collectionGroup de pedidos; usando fallback.", collectionGroupErr);
        const usersSnapshot = await getDocs(collection(db, "users"));
        for (const userDoc of usersSnapshot.docs) {
          const ordersSnapshot = await getDocs(collection(db, "users", userDoc.id, "orders"));
          const userOrders = ordersSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            userId: userDoc.id,
            ...docSnap.data(),
          }));
          allOrders = allOrders.concat(userOrders);
        }
      }
      allOrders.sort((a, b) => getOrderTime(b) - getOrderTime(a));
      setOrders(allOrders);
    } catch (err) {
      console.error("Erro ao buscar pedidos (fetchAllOrders):", err);
      toast.error("Não foi possível carregar a lista de compradores.");
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": {
          const paidOrders = orders.filter(o => o.status === "Pago");
          const pendingOrders = orders.filter(o => o.status === "Pendente");
          const paidRevenue = paidOrders.reduce((s, o) => s + Number(o.price || 0), 0);
          const checkedInCount = paidOrders.filter(o => o.ticket?.validated).length;
          return (
            <>
              <h2 className="text-3xl font-bold text-white mb-6">Dashboard</h2>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {[
                  { icon: DollarSign, label: "Receita Confirmada", value: `R$ ${paidRevenue.toFixed(2)}`, color: "text-green-400", bg: "bg-green-500/10" },
                  { icon: Package, label: "Eventos Ativos", value: eventos.length, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { icon: UserCheck, label: "Check-in / Presença", value: `${checkedInCount} / ${paidOrders.length}`, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { icon: Ticket, label: "Inscrições Pagas", value: paidOrders.length, color: "text-yellow-400", bg: "bg-yellow-500/10" },
                  { icon: BarChart2, label: "Aguardando Pagto.", value: pendingOrders.length, color: "text-orange-400", bg: "bg-orange-500/10" },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-zinc-800 p-5 rounded-xl flex items-center gap-4 border border-zinc-700">
                    <div className={`${kpi.bg} p-3 rounded-xl flex-shrink-0`}>
                      <kpi.icon className={kpi.color} size={26} />
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">{kpi.label}</p>
                      <p className="text-2xl font-bold text-white">{kpi.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vagas por Evento */}
              <h3 className="text-xl font-bold text-white mb-4">Vagas por Evento</h3>
              <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-x-auto mb-8">
                <table className="w-full text-left text-zinc-300">
                  <thead className="bg-zinc-900/50">
                    <tr className="border-b border-zinc-700">
                      <th className="p-4">Evento</th>
                      <th className="p-4">Lote</th>
                      <th className="p-4 text-center">Vendidos</th>
                      <th className="p-4 text-center">Total</th>
                      <th className="p-4 text-center">Restam</th>
                      <th className="p-4 text-center">Ocupação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventos.flatMap((ev) =>
                      (ev.tickets || []).map((t, idx) => {
                        const sold = Number((ev.ticketSoldCounts || {})[String(idx)] || 0);
                        const total = Number(t.quantity || 0);
                        const remaining = total > 0 ? Math.max(0, total - sold) : "∞";
                        const pct = total > 0 ? Math.round((sold / total) * 100) : null;
                        return (
                          <tr key={`${ev.id}-${idx}`} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/30">
                            <td className="p-4 font-semibold text-white">{ev.name}</td>
                            <td className="p-4">{t.type} — R$ {Number(t.price).toFixed(2)}</td>
                            <td className="p-4 text-center text-yellow-400 font-bold">{sold}</td>
                            <td className="p-4 text-center">{total || "—"}</td>
                            <td className={`p-4 text-center font-bold ${remaining === 0 ? "text-red-400" : "text-green-400"}`}>{remaining}</td>
                            <td className="p-4">
                              {pct !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-grow bg-zinc-700 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                                  </div>
                                  <span className="text-xs text-zinc-400 w-8">{pct}%</span>
                                </div>
                              ) : (
                                <span className="text-zinc-500 text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          );
        }
      case "eventos":
        return (
          <TabelaEventoAdmin eventos={eventos} onEdit={handleEdit} onDelete={openDeleteModal} />
        );
      case "addEvento":
        return (
          <FormularioEvento
            onSave={handleSaveEvento}
            initialData={editingEvento}
            onCancel={() => {
              setEditingEvento(null);
              setActiveTab("eventos");
            }}
          />
        );
      case "orders":
        return <ListaPedidosAdmin orders={orders} />;
      case "users":
        return <UserManagement db={db} />;
      case "coupons":
        return <CouponManagement db={db} />;
      case "blog":
        return <BlogManagement db={db} />;
      case "ticketValidation":
        return <ValidadorIngressos eventos={eventos} />;
      case "sponsors":
        return <SponsorManagement db={db} />;
      case "issueTicket":
        return <EmissaoIngressoManual eventos={eventos} onIssued={fetchAllOrders} />;
      case "logs":
        return <ActivityLogsView db={db} />;
      default:
        return null;
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "eventos", label: "Eventos", icon: Package },
    { id: "addEvento", label: "Adicionar", icon: Plus },
    { id: "orders", label: "Compradores", icon: Users },
    { id: "ticketValidation", label: "Validar Ingressos", icon: Tag },
    { id: "issueTicket", label: "Emitir Ingresso", icon: Ticket },
    { id: "users", label: "Usuários", icon: UserCircle2 },
    { id: "coupons", label: "Cupons", icon: Tag },
    { id: "sponsors", label: "Parceiros", icon: DollarSign },
    { id: "blog", label: "Blog", icon: FileText },
    { id: "logs", label: "Logs", icon: FileText },
  ];

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-8 cursor-pointer" onClick={() => onNavigate("home")}>
        <img src="/assets/logo.png" alt="Logo" className="h-16 w-auto invert brightness-0" />
        <button className="md:hidden text-zinc-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-grow">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === "orders" || item.id === "dashboard") fetchAllOrders();
              setActiveTab(item.id);
              setEditingEvento(null);
              setSidebarOpen(false);
            }}
            className={`w-full text-left flex items-center p-3 rounded-lg mb-2 transition-colors ${
              activeTab === item.id ? "bg-violet-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <item.icon className="mr-3" size={20} /> {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-zinc-800">
        <Button onClick={() => onNavigate("home")} variant="secondary" className="w-full mb-2">Ver Site</Button>
        <button onClick={onLogout} className="w-full text-left flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
          <LogOut className="mr-3" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar desktop */}
      <aside className="w-64 bg-zinc-950 p-4 flex-col hidden md:flex">
        <SidebarContent />
      </aside>
      {/* Sidebar mobile (drawer) */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-zinc-950 p-4 flex flex-col z-30 transform transition-transform duration-300 md:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <div className="md:hidden flex items-center gap-3 bg-zinc-950 px-4 py-3 border-b border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-300 hover:text-white">
            <Menu size={24} />
          </button>
          <span className="font-bold text-white">Painel Admin</span>
        </div>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-zinc-900">{renderContent()}</main>
      </div>
      <CaixaDialogo isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmar Exclusão">
        <p className="text-zinc-300 mb-6">
          Você tem certeza que deseja excluir o evento "{eventoToDelete?.name}"? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Excluir
          </Button>
        </div>
      </CaixaDialogo>
    </div>
  );
}
