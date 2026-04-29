// src/admin/CouponManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs
} from 'firebase/firestore';
import { Trash2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

const EMPTY_FORM = {
  code: '',
  discountType: 'percentage',
  value: '',
  eventId: '',      // '' = todos os eventos
  ticketTypes: [],  // [] = todos os ingressos do evento
  maxUses: '',      // '' = ilimitado
};

const CouponManagement = ({ db }) => {
  const [coupons, setCoupons] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [ticketOptions, setTicketOptions] = useState([]); // ingressos do evento selecionado
  const [showForm, setShowForm] = useState(false);

  // Carrega cupons em tempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [db]);

  // Carrega lista de eventos uma vez
  useEffect(() => {
    getDocs(collection(db, 'excursions')).then(snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [db]);

  // Quando o admin escolhe um evento, carrega os tipos de ingresso disponíveis
  useEffect(() => {
    if (!form.eventId) {
      setTicketOptions([]);
      setForm(prev => ({ ...prev, ticketTypes: [] }));
      return;
    }
    const ev = events.find(e => e.id === form.eventId);
    if (ev?.tickets && Array.isArray(ev.tickets)) {
      setTicketOptions(ev.tickets.map(t => t.type));
    } else {
      setTicketOptions([]);
    }
    setForm(prev => ({ ...prev, ticketTypes: [] }));
  }, [form.eventId, events]);

  const toggleTicketType = (type) => {
    setForm(prev => {
      const already = prev.ticketTypes.includes(type);
      return {
        ...prev,
        ticketTypes: already
          ? prev.ticketTypes.filter(t => t !== type)
          : [...prev.ticketTypes, type],
      };
    });
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (!form.code || !form.value) {
      toast.error('Preencha o código e o valor do desconto.');
      return;
    }
    try {
      const selectedEvent = events.find(ev => ev.id === form.eventId);
      await addDoc(collection(db, 'coupons'), {
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        value: Number(form.value),
        isActive: true,
        eventId: form.eventId || null,
        eventName: selectedEvent?.name || null,
        ticketTypes: form.ticketTypes.length > 0 ? form.ticketTypes : null, // null = todos
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        usedCount: 0,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Cupom criado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar cupom:', err);
      toast.error('Erro ao criar o cupom.');
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), { isActive: !coupon.isActive });
      toast.success(`Cupom ${!coupon.isActive ? 'ativado' : 'desativado'}!`);
    } catch {
      toast.error('Erro ao alterar status.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este cupom?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      toast.success('Cupom excluído!');
    } catch {
      toast.error('Erro ao excluir o cupom.');
    }
  };

  const selectedEvent = events.find(e => e.id === form.eventId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Gerenciar Cupons</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          <Tag size={16} />
          {showForm ? 'Cancelar' : 'Novo Cupom'}
          {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <form
          onSubmit={handleAddCoupon}
          className="bg-zinc-800 border border-zinc-700 p-6 rounded-xl mb-8 space-y-5"
        >
          <h3 className="text-lg font-bold text-white">Criar Novo Cupom</h3>

          {/* Linha 1: código, tipo, valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Código *</label>
              <input
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                placeholder="EX: ITACARS20"
                className="w-full bg-zinc-700 text-white p-2 rounded-lg uppercase"
                required
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tipo de Desconto *</label>
              <select
                value={form.discountType}
                onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))}
                className="w-full bg-zinc-700 text-white p-2 rounded-lg"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Valor *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                placeholder={form.discountType === 'percentage' ? 'Ex: 15' : 'Ex: 50.00'}
                className="w-full bg-zinc-700 text-white p-2 rounded-lg"
                required
              />
            </div>
          </div>

          {/* Linha 2: evento e uso máximo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                Restringir a um Evento <span className="text-zinc-500">(opcional)</span>
              </label>
              <select
                value={form.eventId}
                onChange={e => setForm(p => ({ ...p, eventId: e.target.value }))}
                className="w-full bg-zinc-700 text-white p-2 rounded-lg"
              >
                <option value="">— Todos os eventos —</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">
                Limite de Usos <span className="text-zinc-500">(opcional — vazio = ilimitado)</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.maxUses}
                onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                placeholder="Ex: 100"
                className="w-full bg-zinc-700 text-white p-2 rounded-lg"
              />
            </div>
          </div>

          {/* Tipos de ingresso do evento selecionado */}
          {form.eventId && ticketOptions.length > 0 && (
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">
                Restringir a Tipos de Ingresso <span className="text-zinc-500">(nenhum selecionado = todos)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ticketOptions.map(type => {
                  const selected = form.ticketTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleTicketType(type)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                        selected
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:border-violet-500'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              {form.ticketTypes.length === 0 && (
                <p className="text-xs text-zinc-500 mt-1">Nenhum selecionado → válido para todos os ingressos de "{selectedEvent?.name}"</p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-lg font-bold transition"
          >
            Criar Cupom
          </button>
        </form>
      )}

      {/* Lista de cupons */}
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
        {coupons.length === 0 ? (
          <p className="text-zinc-400 text-center py-10">Nenhum cupom cadastrado ainda.</p>
        ) : (
          coupons.map(coupon => (
            <div key={coupon.id} className="flex items-center justify-between p-4 border-b border-zinc-700 last:border-b-0">
              <div className="min-w-0 flex-1 mr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-lg text-white font-mono">{coupon.code}</p>
                  {coupon.eventName && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                      🎯 {coupon.eventName}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {coupon.discountType === 'percentage'
                    ? `${coupon.value}% de desconto`
                    : `R$ ${Number(coupon.value).toFixed(2)} de desconto`}
                  {coupon.ticketTypes?.length > 0 && (
                    <span className="ml-2 text-yellow-400">
                      → {coupon.ticketTypes.join(', ')}
                    </span>
                  )}
                </p>
                {(coupon.maxUses || coupon.usedCount > 0) && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Usos: {coupon.usedCount || 0}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => toggleActive(coupon)}
                  className={`px-3 py-1 text-sm rounded-full font-semibold transition ${
                    coupon.isActive
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                  }`}
                >
                  {coupon.isActive ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="text-red-400 hover:text-red-300 transition">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CouponManagement;