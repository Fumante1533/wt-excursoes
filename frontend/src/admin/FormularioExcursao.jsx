import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, MinusCircle, Trash2 } from "lucide-react";
import { Button, Input, Spinner } from "../components/AppPrimitives";
import { callGeminiAPI } from "../services/geminiMockService";

export default function FormularioExcursao({ onSave, initialData, onCancel }) {
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

  const addTicket = () => setTickets([...tickets, { type: "", price: "" }]);
  const removeTicket = (index) => setTickets(tickets.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const excursionData = {
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
      tickets: tickets.map((t) => ({ ...t, price: parseFloat(t.price) })),
      included: included.filter((item) => item.trim() !== ""),
      notIncluded: notIncluded.filter((item) => item.trim() !== ""),
      totalSlots: parseInt(totalSlots, 10) || 0,
      bookedSlots: initialData?.bookedSlots || 0,
    };
    await onSave(excursionData);
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
          <h3 className="text-xl font-bold text-white mb-4">Inscrições</h3>
          <div className="space-y-4">
            {tickets.map((ticket, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-zinc-700/50 rounded-lg">
                <Input
                  placeholder="Tipo (Ex: Piloto, Espectador)"
                  value={ticket.type}
                  onChange={(e) => handleTicketChange(index, "type", e.target.value)}
                  className="bg-zinc-600 text-white"
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço (Ex: 850.00)"
                  value={ticket.price}
                  onChange={(e) => handleTicketChange(index, "price", e.target.value)}
                  className="bg-zinc-600 text-white"
                  required
                />
                <button type="button" onClick={() => removeTicket(index)} className="p-2 text-red-400 hover:text-red-300">
                  <Trash2 />
                </button>
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
    </motion.div>
  );
}
