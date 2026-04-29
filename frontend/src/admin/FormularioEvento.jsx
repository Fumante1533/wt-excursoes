import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MinusCircle, Trash2 } from "lucide-react";
import { Button, Input, Spinner } from "../components/AppPrimitives";
import { callGeminiAPI } from "../services/geminiMockService";

export default function FormularioEvento({ onSave, initialData, onCancel }) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [image, setImage] = useState(initialData?.image || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [time, setTime] = useState(initialData?.time || "");
  const [timeEnd, setTimeEnd] = useState(initialData?.timeEnd || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const category = initialData?.category || "Encontro";
  const [tag, setTag] = useState(initialData?.tag || "Novo");
  const [tickets, setTickets] = useState(initialData?.tickets || [{ type: "", price: "" }]);
  const [included, setIncluded] = useState(initialData?.included || [""]);
  const [notIncluded, setNotIncluded] = useState(initialData?.notIncluded || [""]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [totalSlots, setTotalSlots] = useState(initialData?.totalSlots || "");
  const [showBatchAssistant, setShowBatchAssistant] = useState(false);
  const [batchConfig, setBatchConfig] = useState({
    baseName: "Carro",
    count: 3,
    startPrice: 20,
    increase: 10,
    slotsPerBatch: 50
  });
  const [activeBatchToConfigure, setActiveBatchToConfigure] = useState(null);
  const [configNewBatch, setConfigNewBatch] = useState({ type: "", price: "", quantity: "" });

  const handleGenerateDescription = async () => {
    if (!name) {
      alert("Preencha o nome do evento para gerar uma descrição.");
      return;
    }
    setIsGenerating(true);
    const prompt = `Gerar descrição de marketing para evento chamado "${name}" que acontece em "${location}".`;
    const result = await callGeminiAPI(prompt);
    setDescription(result);
    setIsGenerating(false);
  };

  const handleListChange = (list, setList, index, value) => {
    const newList = [...list];
    newList[index] = value;
    setList(newList);
  };

  const addListItem = (setList) => {
    setList((prev) => [...prev, ""]);
  };

  const removeListItem = (list, setList, index) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleTicketChange = (index, field, value) => {
    const newTickets = [...tickets];
    newTickets[index][field] = value;
    setTickets(newTickets);
  };

  const addTicket = () => setTickets([...tickets, { type: "", price: "", quantity: "" }]);
  const removeTicket = (index) => setTickets(tickets.filter((_, i) => i !== index));

  const duplicateTicket = (index) => {
    const ticket = tickets[index];
    let nextType = ticket.type;
    
    // Tenta detectar se já existe um número de lote (ex: 1º Lote, 2º Lote)
    const batchMatch = ticket.type.match(/(\d+)[º°] Lote/i);
    
    if (batchMatch) {
      // Se já tem um lote, incrementa o número
      const nextNum = parseInt(batchMatch[1]) + 1;
      nextType = ticket.type.replace(batchMatch[0], `${nextNum}º Lote`);
    } else if (ticket.type) {
      // Se não tem lote ainda (ex: "Carro"), adiciona " - 2º Lote"
      // (Considerando que o primeiro é o 1º Lote implicitamente)
      nextType = `${ticket.type} - 2º Lote`;
    }

    setConfigNewBatch({
      type: nextType,
      price: ticket.price ? (parseFloat(ticket.price) + 5).toString() : "",
      quantity: ticket.quantity || ""
    });
    setActiveBatchToConfigure(index);
  };

  const confirmNewBatch = () => {
    setTickets([...tickets, configNewBatch]);
    setActiveBatchToConfigure(null);
  };

  const generateAutomaticBatches = () => {
    const newBatches = [];
    for (let i = 1; i <= batchConfig.count; i++) {
      const price = parseFloat(batchConfig.startPrice) + (parseFloat(batchConfig.increase) * (i - 1));
      newBatches.push({
        type: `${batchConfig.baseName} - ${i}º Lote`,
        price: price.toString(),
        quantity: batchConfig.slotsPerBatch.toString()
      });
    }
    // Adiciona ao final da lista atual
    setTickets([...tickets, ...newBatches]);
    setShowBatchAssistant(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const eventoData = {
      id: initialData?.id || null,
      name,
      description,
      image,
      date,
      time,
      timeEnd,
      location,
      category,
      tag,
      tickets: tickets.map((t) => ({ ...t, price: parseFloat(t.price), quantity: parseInt(t.quantity, 10) || 0 })),
      included: included.filter((item) => item.trim() !== ""),
      notIncluded: notIncluded.filter((item) => item.trim() !== ""),
      totalSlots: parseInt(totalSlots, 10) || 0,
      bookedSlots: initialData?.bookedSlots || 0,
    };
    await onSave(eventoData);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-bold text-white mb-6">
        {initialData ? "Editar Evento" : "Adicionar Novo Evento"}
      </h2>
      <form onSubmit={handleSubmit} className="bg-zinc-800 p-8 rounded-lg shadow-xl space-y-6">
        <Input
          placeholder="Nome do Evento"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-700 text-white border-zinc-600"
          required
        />
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold text-zinc-300">Descrição Completa</label>
            <button
              type="button"
              onClick={handleGenerateDescription}
              disabled={isGenerating}
              className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Spinner /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Gerar com IA
                </>
              )}
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="5"
            className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg border-2 border-zinc-600 focus:border-violet-500 focus:bg-zinc-800 focus:ring-0 transition-all duration-300"
            required
          />
        </div>
        <Input
          placeholder="URL da Imagem Principal"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          className="bg-zinc-700 text-white border-zinc-600"
          required
        />
        {image && (
          <div className="space-y-2">
            <img
              src={image}
              alt="Prévia do evento"
              className="w-full h-48 object-cover rounded-md"
            />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-zinc-700 text-white border-zinc-600"
            required
          />
          <div className="flex gap-2">
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-zinc-700 text-white border-zinc-600 flex-1"
              required
              placeholder="Início"
              title="Horário de Início"
            />
            <span className="text-zinc-400 self-center">até</span>
            <Input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="bg-zinc-700 text-white border-zinc-600 flex-1"
              required
              placeholder="Fim"
              title="Horário de Término"
            />
          </div>
          <Input
            placeholder="Local (Ex: Cidade, UF)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-zinc-700 text-white border-zinc-600"
            required
          />
          <Input
            type="number"
            placeholder="Vagas Totais"
            value={totalSlots}
            onChange={(e) => setTotalSlots(e.target.value)}
            className="bg-zinc-700 text-white border-zinc-600"
          />

          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-700 text-white rounded-lg border-2 border-zinc-600 focus:border-violet-500 focus:bg-zinc-800 focus:ring-0 transition-all duration-300"
          >
            <option>Novo</option>
            <option>Vagas Limitadas</option>
            <option>Exclusivo</option>
            <option>Clássicos</option>
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Itens Inclusos</h3>
            {included.map((item, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <Input
                  value={item}
                  onChange={(e) => handleListChange(included, setIncluded, index, e.target.value)}
                  className="bg-zinc-600 text-white"
                />
                <button
                  type="button"
                  onClick={() => removeListItem(included, setIncluded, index)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <MinusCircle size={20} />
                </button>
              </div>
            ))}
            <Button type="button" onClick={() => addListItem(setIncluded)} variant="secondary" className="mt-2 text-sm py-1 px-3">
              Adicionar Item
            </Button>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Itens Não Inclusos</h3>
            {notIncluded.map((item, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <Input
                  value={item}
                  onChange={(e) => handleListChange(notIncluded, setNotIncluded, index, e.target.value)}
                  className="bg-zinc-600 text-white"
                />
                <button
                  type="button"
                  onClick={() => removeListItem(notIncluded, setNotIncluded, index)}
                  className="p-2 text-red-400 hover:text-red-300"
                >
                  <MinusCircle size={20} />
                </button>
              </div>
            ))}
            <Button type="button" onClick={() => addListItem(setNotIncluded)} variant="secondary" className="mt-2 text-sm py-1 px-3">
              Adicionar Item
            </Button>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Inscrições / Lotes</h3>
            <button
              type="button"
              onClick={() => setShowBatchAssistant(!showBatchAssistant)}
              className="text-sm bg-violet-600/20 text-violet-400 hover:bg-violet-600/40 px-3 py-1.5 rounded-lg border border-violet-500/30 transition-all flex items-center gap-2"
            >
              <Sparkles size={16} /> Assistente de Lotes
            </button>
          </div>

          {showBatchAssistant && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mb-6 p-6 bg-violet-950/20 border-2 border-violet-500/20 rounded-2xl space-y-4"
            >
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <Sparkles size={20} />
                <span className="font-bold uppercase text-xs tracking-wider">Configurador de Lotes Automáticos</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Nome Base</label>
                  <Input 
                    value={batchConfig.baseName} 
                    onChange={e => setBatchConfig({...batchConfig, baseName: e.target.value})}
                    placeholder="Ex: Carro"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Qtd Lotes</label>
                  <Input 
                    type="number"
                    value={batchConfig.count} 
                    onChange={e => setBatchConfig({...batchConfig, count: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Preço Inicial</label>
                  <Input 
                    type="number"
                    value={batchConfig.startPrice} 
                    onChange={e => setBatchConfig({...batchConfig, startPrice: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Sobe (+ R$)</label>
                  <Input 
                    type="number"
                    value={batchConfig.increase} 
                    onChange={e => setBatchConfig({...batchConfig, increase: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-zinc-400 font-bold mb-1 block">Vagas/Lote</label>
                  <Input 
                    type="number"
                    value={batchConfig.slotsPerBatch} 
                    onChange={e => setBatchConfig({...batchConfig, slotsPerBatch: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowBatchAssistant(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={generateAutomaticBatches}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                >
                  Gerar Lotes Agora
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-4">
            {tickets.map((ticket, index) => (
              <div key={index} className="p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-zinc-400 mb-1 block">Tipo / Nome do Ingresso</label>
                      <Input
                        placeholder="Ex: Carro"
                        value={ticket.type}
                        onChange={(e) => handleTicketChange(index, "type", e.target.value)}
                        className="bg-zinc-600 text-white font-bold"
                        required
                      />
                    </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Preço (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10.00"
                      value={ticket.price}
                      onChange={(e) => handleTicketChange(index, "price", e.target.value)}
                      className="bg-zinc-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block" title="Deixe 0 ou vazio para ilimitado">
                      Vagas do Lote
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0 = ∞"
                      value={ticket.quantity}
                      onChange={(e) => handleTicketChange(index, "quantity", e.target.value)}
                      className="bg-zinc-600 text-white"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => duplicateTicket(index)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 text-violet-400 hover:bg-violet-600/40 rounded-lg border border-violet-500/30 transition-all text-[10px] font-bold uppercase whitespace-nowrap"
                    >
                      <Sparkles size={14} /> Próximo Lote
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTicket(index)}
                      className="flex items-center justify-center p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" onClick={addTicket} variant="secondary" className="mt-4">
            Adicionar Inscrição
          </Button>
        </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-zinc-700">
            <Button type="button" variant="secondary" onClick={() => onCancel?.()}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? "Salvar Alterações" : "Cadastrar Evento"}
            </Button>
          </div>
        </form>

        {/* Modal de Configuração de Lote */}
        {activeBatchToConfigure !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-violet-500/30 p-8 rounded-3xl shadow-2xl max-w-md w-full space-y-6"
            >
              <div className="flex items-center gap-3 text-violet-400">
                <div className="p-3 bg-violet-500/10 rounded-2xl">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Configurar Próximo Lote</h3>
                  <p className="text-xs text-zinc-400">Personalize os detalhes antes de adicionar</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Nome do Lote</label>
                  <Input 
                    value={configNewBatch.type} 
                    onChange={e => setConfigNewBatch({...configNewBatch, type: e.target.value})}
                    className="bg-zinc-800 border-zinc-700 h-12"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Preço (R$)</label>
                    <Input 
                      type="number"
                      value={configNewBatch.price} 
                      onChange={e => setConfigNewBatch({...configNewBatch, price: e.target.value})}
                      className="bg-zinc-800 border-zinc-700 h-12"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Vagas</label>
                    <Input 
                      type="number"
                      placeholder="Ilimitado"
                      value={configNewBatch.quantity} 
                      onChange={e => setConfigNewBatch({...configNewBatch, quantity: e.target.value})}
                      className="bg-zinc-800 border-zinc-700 h-12"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setActiveBatchToConfigure(null)}
                  className="flex-1 px-4 py-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={confirmNewBatch}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-violet-500/20 transition-all font-bold"
                >
                  Adicionar Lote
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
  );
}
