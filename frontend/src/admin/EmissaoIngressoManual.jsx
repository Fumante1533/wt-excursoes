import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Ticket, User, Car, DollarSign, Mail, CheckCircle2,
  ClipboardCopy, RotateCcw,
} from "lucide-react";
import { auth } from "../firebaseConfig";
import { toast } from "react-hot-toast";

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência bancária" },
  { value: "cartao_maquininha", label: "Cartão (maquininha)" },
  { value: "parcelado", label: "Parcelado (acordo)" },
  { value: "cortesia", label: "Cortesia / Gratuito" },
  { value: "outro", label: "Outro" },
];

const initialForm = {
  ticketType: "",
  buyerName: "",
  buyerEmail: "",
  buyerPhone: "",
  buyerCpf: "",
  carPlate: "",
  carModel: "",
  carYear: "",
  carColor: "",
  price: "",
  paymentMethod: "pix",
  notes: "",
  sendEmail: true,
  targetUserId: "",
};

export default function EmissaoIngressoManual({ eventos }) {
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // { ticketCode, orderId }

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSelectEvento = (eventoId) => {
    const ev = eventos.find((e) => String(e.id) === eventoId);
    setSelectedEvento(ev || null);
    setForm((prev) => ({ ...prev, ticketType: "" }));
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEvento) { toast.error("Selecione um evento."); return; }
    if (!form.ticketType) { toast.error("Selecione o tipo de ingresso."); return; }
    if (!form.buyerName.trim()) { toast.error("Nome do comprador é obrigatório."); return; }

    setIsLoading(true);
    setResult(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { toast.error("Sessão expirada. Faça login novamente."); return; }

      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      const response = await fetch(`${backendUrl}/api/admin/issue-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventoId: String(selectedEvento.id),
          ticketType: form.ticketType,
          buyerName: form.buyerName.trim(),
          buyerEmail: form.buyerEmail.trim(),
          buyerPhone: form.buyerPhone.trim(),
          buyerCpf: form.buyerCpf.trim(),
          carPlate: form.carPlate.trim().toUpperCase(),
          carModel: form.carModel.trim(),
          carYear: form.carYear.trim(),
          carColor: form.carColor.trim(),
          price: Number(form.price) || 0,
          paymentMethod: form.paymentMethod,
          notes: form.notes.trim(),
          sendEmail: form.sendEmail,
          targetUserId: form.targetUserId.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao emitir ingresso.");

      setResult(data);
      toast.success(`Ingresso ${data.ticketCode} emitido com sucesso!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setForm(initialForm);
    setSelectedEvento(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
  };

  const inputClass = "w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500 text-sm";
  const labelClass = "block text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl">
          <Ticket size={24} className="text-yellow-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Emitir Ingresso Manual</h2>
          <p className="text-zinc-400 text-sm">Para vendas feitas fora da plataforma (PIX direto, dinheiro, etc.)</p>
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 size={28} className="text-green-400" />
            <h3 className="text-xl font-bold text-white">Ingresso emitido com sucesso!</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs mb-1">Código do Ingresso</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-bold text-yellow-400">{result.ticketCode}</span>
                <button
                  onClick={() => copyToClipboard(result.ticketCode)}
                  className="text-zinc-500 hover:text-white transition-colors"
                  title="Copiar"
                >
                  <ClipboardCopy size={18} />
                </button>
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-zinc-400 text-xs mb-1">ID do Pedido</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-zinc-300 break-all">{result.orderId}</span>
                <button
                  onClick={() => copyToClipboard(result.orderId)}
                  className="text-zinc-500 hover:text-white transition-colors flex-shrink-0"
                  title="Copiar"
                >
                  <ClipboardCopy size={18} />
                </button>
              </div>
            </div>
          </div>
          {form.sendEmail && form.buyerEmail && (
            <p className="text-green-400 text-sm mt-3 flex items-center gap-2">
              <Mail size={14} /> Ingresso enviado para {form.buyerEmail}
            </p>
          )}
          <button
            onClick={handleReset}
            className="mt-4 flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <RotateCcw size={14} /> Emitir outro ingresso
          </button>
        </motion.div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Evento */}
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Ticket size={16} className="text-yellow-400" /> Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Evento *</label>
                <select
                  className={inputClass}
                  value={selectedEvento ? String(selectedEvento.id) : ""}
                  onChange={(e) => handleSelectEvento(e.target.value)}
                  required
                >
                  <option value="">Selecione o evento...</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={String(ev.id)}>
                      {ev.name} {ev.date ? `— ${new Date(ev.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo de Ingresso (Lote) *</label>
                <select
                  className={inputClass}
                  value={form.ticketType}
                  onChange={(e) => set("ticketType", e.target.value)}
                  required
                  disabled={!selectedEvento}
                >
                  <option value="">Selecione o lote...</option>
                  {(selectedEvento?.tickets || []).map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.type} — R$ {Number(t.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Comprador */}
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User size={16} className="text-violet-400" /> Dados do Comprador
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nome Completo *</label>
                <input className={inputClass} placeholder="Nome do comprador" value={form.buyerName} onChange={(e) => set("buyerName", e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>E-mail</label>
                <input className={inputClass} type="email" placeholder="email@exemplo.com" value={form.buyerEmail} onChange={(e) => set("buyerEmail", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Telefone / WhatsApp</label>
                <input className={inputClass} placeholder="(17) 99999-9999" value={form.buyerPhone} onChange={(e) => set("buyerPhone", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>CPF</label>
                <input className={inputClass} placeholder="000.000.000-00" value={form.buyerCpf} onChange={(e) => set("buyerCpf", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>UID Firebase (opcional)</label>
                <input className={inputClass} placeholder="Cole o UID do usuário cadastrado" value={form.targetUserId} onChange={(e) => set("targetUserId", e.target.value)} />
                <p className="text-zinc-500 text-xs mt-1">Se preenchido, o ingresso aparece na conta do usuário.</p>
              </div>
            </div>
          </div>

          {/* Seção 3: Carro */}
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Car size={16} className="text-blue-400" /> Dados do Veículo
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Placa</label>
                <input
                  className={`${inputClass} uppercase`}
                  placeholder="ABC1D23"
                  maxLength={7}
                  value={form.carPlate}
                  onChange={(e) => set("carPlate", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
                />
              </div>
              <div>
                <label className={labelClass}>Modelo</label>
                <input className={inputClass} placeholder="Ex: Corsa" value={form.carModel} onChange={(e) => set("carModel", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Ano</label>
                <input className={inputClass} placeholder="2010" type="number" min="1900" max="2099" value={form.carYear} onChange={(e) => set("carYear", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Cor</label>
                <input className={inputClass} placeholder="Prata" value={form.carColor} onChange={(e) => set("carColor", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Seção 4: Pagamento */}
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" /> Pagamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Valor Recebido (R$)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Forma de Pagamento</label>
                <select className={inputClass} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>Observações Internas</label>
                <input className={inputClass} placeholder="Ex: Vendido no evento X, combo amigo..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Opções */}
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("sendEmail", !form.sendEmail)}
                className={`w-10 h-6 rounded-full transition-colors relative ${form.sendEmail ? "bg-violet-600" : "bg-zinc-600"}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.sendEmail ? "left-5" : "left-1"}`} />
              </div>
              <span className="text-zinc-300 flex items-center gap-2">
                <Mail size={16} className="text-violet-400" />
                Enviar ingresso por e-mail para o comprador
                {!form.buyerEmail && form.sendEmail && (
                  <span className="text-orange-400 text-xs">(preencha o e-mail acima)</span>
                )}
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-bold rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                Emitindo ingresso...
              </>
            ) : (
              <>
                <Ticket size={20} /> Emitir Ingresso
              </>
            )}
          </button>
        </form>
      )}
    </motion.div>
  );
}
