import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Calendar,
  Clock,
  Ticket,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  X,
  Image as ImageIcon,
  Bot,
  Sparkles,
  Car,
} from "lucide-react";
import ReviewSection from "../components/ReviewSection";
import { Card, Button, PageWrapper, Input, Spinner } from "../components/AppPrimitives";
import { CartaoEvento, EsqueletoCartaoEvento } from "../components/CartaoEvento";
import { callGeminiAPI } from "../services/geminiMockService";

export function PaginaListaEventos({ onNavigate, eventos, user, db }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("Todos");
  const [filterDate, setFilterDate] = useState("");
  const [filteredEventos, setFilteredEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const upcomingEvents = eventos.filter((e) => new Date(e.date) >= new Date());
  const categories = ["Todos", ...new Set(upcomingEvents.map((e) => e.category))];
  useEffect(() => {
    setTimeout(() => {
      setFilteredEventos(upcomingEvents);
      setLoading(false);
    }, 1000);
  }, [eventos]);
  useEffect(() => {
    let results = eventos.filter(
      (ex) =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filterCategory !== "Todos") {
      results = results.filter((ex) => ex.category === filterCategory);
    }
    if (filterDate) {
      results = results.filter((ex) => ex.date === filterDate);
    }
    setFilteredEventos(results);
  }, [searchTerm, filterCategory, eventos, filterDate]);
  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-4">
            Explore Nossos Eventos
          </h1>
          <p className="text-lg text-center text-zinc-600 dark:text-zinc-300 mb-12">
            Encontre o evento perfeito para você e seu carro.
          </p>
          <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-2xl mx-auto">
            <Input
              type="text"
              placeholder="Buscar por nome ou local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} icon={Calendar} />
            <div className="relative">
              <select
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full md:w-auto appearance-none px-4 py-3 bg-zinc-100 dark:bg-zinc-800 dark:text-white rounded-lg border-2 border-transparent focus:border-yellow-500 focus:bg-white dark:focus:bg-zinc-700 focus:ring-0 transition-all duration-300 pr-12"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <EsqueletoCartaoEvento key={i} />)
            ) : filteredEventos.length > 0 ? (
              filteredEventos.map((ex, i) => (
                <CartaoEvento key={ex.id} event={ex} onNavigate={onNavigate} index={i} user={user} db={db} />
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <h3 className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">Nenhum evento encontrado</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Tente ajustar sua busca ou filtros.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export function PaginaEventosPassados({ onNavigate, eventos, user, db }) {
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filtered = eventos
      .filter((e) => new Date(e.date) < new Date())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    setPastEvents(filtered);
    setLoading(false);
  }, [eventos]);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-4">
            Eventos Realizados
          </h1>
          <p className="text-lg text-center text-zinc-600 dark:text-zinc-300 mb-12">
            Relembre os momentos incríveis que já compartilhamos.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <EsqueletoCartaoEvento key={i} />)
            ) : pastEvents.length > 0 ? (
              pastEvents.map((ex, i) => (
                <CartaoEvento key={ex.id} event={ex} onNavigate={onNavigate} index={i} user={user} db={db} />
              ))
            ) : (
              <div className="col-span-full text-center py-16">
                <h3 className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">Nenhum evento passado encontrado</h3>
                <p className="text-zinc-500 dark:text-zinc-400">Nossa história está apenas começando!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export function PaginaCentralEventos({ onNavigate, eventos, user, db }) {
  const [activeTab, setActiveTab] = useState("upcoming");

  const upcomingEvents = eventos
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastEvents = eventos
    .filter((e) => new Date(e.date) < new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const eventsToShow = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-4">
            Nossos Eventos
          </h1>
          <p className="text-lg text-center text-zinc-600 dark:text-zinc-300 mb-12">
            Explore os próximos encontros ou relembre os que já aconteceram.
          </p>

          <div className="flex justify-center border-b border-zinc-200 dark:border-zinc-800 mb-12">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === "upcoming"
                  ? "border-b-2 border-yellow-500 text-yellow-500"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              }`}
            >
              Próximos Eventos
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === "past"
                  ? "border-b-2 border-yellow-500 text-yellow-500"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              }`}
            >
              Eventos Realizados
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {eventsToShow.length > 0 ? (
                eventsToShow.map((ex, i) => (
                  <CartaoEvento key={ex.id} event={ex} onNavigate={onNavigate} index={i} user={user} db={db} />
                ))
              ) : (
                <div className="col-span-full text-center py-16">
                  <h3 className="text-2xl font-bold text-zinc-700 dark:text-zinc-200">Nenhum evento encontrado.</h3>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}

function ModalGaleria({ isOpen, onClose, imageUrl }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="relative max-w-4xl max-h-[90vh] w-full p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={imageUrl} alt="Visualização da Galeria" className="w-full h-full object-contain rounded-lg" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 transition-colors"
          >
            <X size={24} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function AssistenteIaPreparacao({ eventoName }) {
  const [interests, setInterests] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const handleGenerate = async () => {
    if (!interests) {
      alert("Por favor, diga-nos seus interesses!");
      return;
    }
    setIsLoading(true);
    setItinerary("");
    const prompt = `Sugestões de preparação para o evento "${eventoName}" com foco em: ${interests}.`;
    const result = await callGeminiAPI(prompt);
    setItinerary(result);
    setIsLoading(false);
  };
  const renderFormattedText = (text) =>
    text.split("\n").map((line, index) => {
      if (line.startsWith("### "))
        return (
          <h3 key={index} className="text-xl font-bold text-violet-700 dark:text-violet-400 mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
      if (line.startsWith("**") && line.endsWith("**"))
        return (
          <p key={index} className="font-bold my-1 text-zinc-800 dark:text-white">
            {line.substring(2, line.length - 2)}
          </p>
        );
      if (line.startsWith("- "))
        return (
          <li key={index} className="ml-4 mb-1">
            {line.substring(2)}
          </li>
        );
      return (
        <p key={index} className="mb-1">
          {line}
        </p>
      );
    });
  return (
    <div className="mt-12 bg-violet-100/30 dark:bg-zinc-800/50 p-8 rounded-2xl border border-violet-200 dark:border-zinc-800">
      <div className="flex items-center mb-4">
        <Bot size={28} className="text-yellow-500 mr-3" />
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Prepare-se para o Evento com IA</h2>
      </div>
      <p className="text-zinc-600 dark:text-zinc-300 mb-6">
        Diga-nos seus objetivos (ex: segurança, performance, fotografia) e nossa IA criará um guia de preparação para você!
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Ex: segurança do carro, melhor tempo, fotos incríveis"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
        <Button onClick={handleGenerate} disabled={isLoading} className="flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Spinner /> Gerando...
            </>
          ) : (
            <>
              <Sparkles size={18} /> Gerar Guia
            </>
          )}
        </Button>
      </div>
      {itinerary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-inner prose max-w-none dark:prose-invert"
        >
          {renderFormattedText(itinerary)}
        </motion.div>
      )}
    </div>
  );
}

export function PaginaDetalheEvento({ onNavigate, evento, user, db }) {
  const [activeImage, setActiveImage] = useState(evento.image);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  const openGalleryModal = (imageUrl) => {
    setSelectedGalleryImage(imageUrl);
    setIsGalleryModalOpen(true);
  };

  const remainingSlots = evento.totalSlots ? evento.totalSlots - (evento.bookedSlots || 0) : null;
  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <div className="grid md:grid-cols-5 md:gap-8">
              <div className="md:col-span-3">
                <motion.div
                  layoutId={`evento-image-${evento.id}`}
                  className="overflow-hidden rounded-t-2xl md:rounded-l-2xl md:rounded-t-none"
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      src={activeImage}
                      alt={evento.name}
                      className="w-full h-96 object-cover"
                    />
                  </AnimatePresence>
                </motion.div>
                <div className="p-4 flex space-x-2 bg-zinc-50 dark:bg-zinc-800/50 md:rounded-bl-2xl">
                  {evento.images?.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      onClick={() => setActiveImage(img)}
                      className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-4 transition-all ${
                        activeImage === img
                          ? "border-violet-500 scale-105"
                          : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                      alt={`Miniatura ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-8 flex flex-col md:col-span-2">
                <h1 className="text-3xl font-bold text-zinc-800 dark:text-white mb-4">{evento.name}</h1>
                <div className="flex flex-wrap items-center text-zinc-500 dark:text-zinc-400 mb-4 gap-4">
                  <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                    <span className="flex items-center whitespace-nowrap text-zinc-800 dark:text-white font-medium text-sm">
                      <MapPin size={18} className="mr-2 text-yellow-500" /> {evento.location}
                    </span>
                    <div className="flex items-center gap-1 border-l border-zinc-300 dark:border-zinc-700 pl-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(evento.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline px-1.5 py-0.5 rounded hover:bg-yellow-500/10 transition-colors"
                        title="Abrir no Google Maps"
                      >
                        Google Maps
                      </a>
                      <span className="text-zinc-400 text-xs">•</span>
                      <a
                        href={`https://waze.com/ul?q=${encodeURIComponent(evento.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-yellow-600 dark:text-yellow-400 hover:underline px-1.5 py-0.5 rounded hover:bg-yellow-500/10 transition-colors"
                        title="Abrir no Waze"
                      >
                        Waze
                      </a>
                    </div>
                  </div>
                  <span className="flex items-center whitespace-nowrap"><Calendar size={18} className="mr-2 text-yellow-500" />{" "}
                  {new Date(evento.date).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}</span>
                  {evento.time && (
                    <span className="flex items-center whitespace-nowrap"><Clock size={18} className="mr-2 text-yellow-500" /> {evento.time} {evento.timeEnd && `às ${evento.timeEnd}`}</span>
                  )}
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 mb-8 flex-grow whitespace-pre-wrap">{evento.description}</p>
                {remainingSlots !== null && (
                  <div className="mb-6 p-3 bg-blue-50 dark:bg-zinc-800 rounded-lg text-center">
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {remainingSlots > 0 ? `Apenas ${remainingSlots} vagas restantes!` : "Vagas Esgotadas!"}
                    </p>
                  </div>
                )}

                {new Date(evento.date) >= new Date() ? (
                  <div className="mt-auto">
                    {(() => {
                      const salesStarted = !evento.salesStartAt || new Date(evento.salesStartAt) <= new Date();
                      const salesEnded = evento.salesEndAt && new Date(evento.salesEndAt) <= new Date();
                      
                      if (!salesStarted) {
                        return (
                          <div className="mb-8 p-6 bg-violet-500/10 border border-violet-500/20 rounded-3xl text-center">
                            <p className="text-violet-500 dark:text-violet-400 font-black text-xl mb-2 flex items-center justify-center gap-2">
                              <Clock size={24} /> VENDAS EM BREVE!
                            </p>
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                              Este evento começará a vender ingressos em:
                              <br />
                              <span className="text-zinc-800 dark:text-white font-bold text-lg">
                                {new Date(evento.salesStartAt).toLocaleString("pt-BR", {
                                  dateStyle: "short",
                                  timeStyle: "short"
                                })}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      
                      if (salesEnded) {
                        return (
                          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-center">
                            <p className="text-red-500 dark:text-red-400 font-black text-xl mb-2 flex items-center justify-center gap-2">
                              <XCircle size={24} /> VENDAS ENCERRADAS
                            </p>
                            <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                              O prazo para compra de ingressos online terminou em:
                              <br />
                              <span className="text-zinc-800 dark:text-white font-bold text-lg">
                                {new Date(evento.salesEndAt).toLocaleString("pt-BR", {
                                  dateStyle: "short",
                                  timeStyle: "short"
                                })}
                              </span>
                            </p>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                    
                    <h2 className="text-2xl font-bold text-zinc-700 dark:text-white mb-4">Tipos de Inscrição</h2>
                    <div className="space-y-4">
                    <div className="space-y-6">
                      {(() => {
                        // Agrupa os ingressos por "Tipo Base" (ex: Carro, Moto)
                        const groups = {};
                        evento.tickets.forEach((t, idx) => {
                          const baseType = t.type.split(" - ")[0].trim();
                          if (!groups[baseType]) groups[baseType] = [];
                          groups[baseType].push({ ...t, originalIndex: idx });
                        });

                        return Object.entries(groups).map(([baseName, groupTickets]) => {
                          // Encontra o lote ativo (o primeiro que não está esgotado)
                          const activeTicket = groupTickets.find(t => {
                            const sold = evento.ticketSoldCounts?.[String(t.originalIndex)] || 0;
                            const qty = t.quantity || 0;
                            return qty === 0 || sold < qty;
                          }) || groupTickets[groupTickets.length - 1]; // Se tudo esgotado, pega o último

                          const sold = evento.ticketSoldCounts?.[String(activeTicket.originalIndex)] || 0;
                          const qty = activeTicket.quantity || 0;
                          const isSoldOut = qty > 0 && sold >= qty;
                          const remaining = qty > 0 ? qty - sold : null;

                          return (
                            <div key={baseName} className="bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
                              <div className="p-4 bg-zinc-200/50 dark:bg-zinc-700/30 border-b border-zinc-200 dark:border-zinc-700/50 flex justify-between items-center">
                                <h3 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
                                  <Car size={18} className="text-yellow-500" /> {baseName}
                                </h3>
                                {groupTickets.length > 1 && (
                                  <span className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full font-bold uppercase">
                                    {groupTickets.length} Lotes Disponíveis
                                  </span>
                                )}
                              </div>
                              
                              <div className="p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex-grow text-center md:text-left">
                                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                    <p className="font-bold text-xl text-zinc-900 dark:text-white">
                                      {activeTicket.type.includes(" - ") ? activeTicket.type.split(" - ")[1] : activeTicket.type}
                                    </p>
                                    {isSoldOut && (
                                      <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase animate-pulse">Esgotado</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center justify-center md:justify-start gap-3">
                                    <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">
                                      R$ {Number(activeTicket.price).toFixed(2)}
                                    </p>
                                    {remaining !== null && !isSoldOut && (
                                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded-lg">
                                        {remaining} {remaining === 1 ? "vaga" : "vagas"}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  onClick={() => {
                                    if (typeof onNavigate.onAddToCart === "function") {
                                      onNavigate.onAddToCart(evento, activeTicket);
                                    }
                                  }}
                                  disabled={
                                    isSoldOut || 
                                    (evento.salesStartAt && new Date(evento.salesStartAt) > new Date()) || 
                                    (evento.salesEndAt && new Date(evento.salesEndAt) <= new Date()) ||
                                    typeof onNavigate.onAddToCart !== "function"
                                  }
                                  className={`w-full md:w-auto h-14 px-8 text-lg font-bold shadow-lg transition-all ${
                                    isSoldOut || 
                                    (evento.salesStartAt && new Date(evento.salesStartAt) > new Date()) ||
                                    (evento.salesEndAt && new Date(evento.salesEndAt) <= new Date())
                                      ? "bg-zinc-400 dark:bg-zinc-600 cursor-not-allowed opacity-50" 
                                      : "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 hover:scale-105"
                                  }`}
                                >
                                  {isSoldOut ? "Esgotado" : 
                                   (evento.salesEndAt && new Date(evento.salesEndAt) <= new Date()) ? "Encerrado" :
                                   (evento.salesStartAt && new Date(evento.salesStartAt) > new Date()) ? (
                                    <span className="flex items-center gap-2">
                                      Vendas em Breve <Clock size={20} />
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      Garantir Vaga <Ticket size={20} />
                                    </span>
                                  )}
                                </Button>
                              </div>

                              {/* Histórico de Lotes (Mini) */}
                              {groupTickets.length > 1 && (
                                <div className="px-5 pb-4 flex flex-wrap gap-2 opacity-60">
                                  {groupTickets.map((t) => {
                                    const tSold = evento.ticketSoldCounts?.[String(t.originalIndex)] || 0;
                                    const tQty = t.quantity || 0;
                                    const tIsSoldOut = tQty > 0 && tSold >= tQty;
                                    const tIsActive = t.originalIndex === activeTicket.originalIndex;

                                    return (
                                      <div 
                                        key={t.type} 
                                        className={`text-[10px] px-2 py-1 rounded border ${
                                          tIsActive 
                                            ? "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 font-bold" 
                                            : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                                        } ${tIsSoldOut ? "line-through grayscale" : ""}`}
                                      >
                                        {t.type.split(" - ")[1] || t.type}: R$ {Number(t.price).toFixed(0)}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto text-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <h3 className="text-xl font-bold text-zinc-700 dark:text-white">Evento Realizado</h3>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Este evento já aconteceu. Confira a galeria de fotos abaixo!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-4 text-zinc-800 dark:text-white">O que está incluso?</h3>
              <ul className="space-y-2">
                {evento.included?.map((item, i) => (
                  <li key={i} className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <CheckCircle size={18} className="text-green-500 mr-3" /> {item}
                  </li>
                ))}
                {evento.notIncluded?.map((item, i) => (
                  <li key={i} className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <XCircle size={18} className="text-red-500 mr-3" /> {item}
                  </li>
                ))}
              </ul>
            </Card>

            {new Date(evento.date) < new Date() &&
              evento.galleryImages &&
              evento.galleryImages.length > 0 && (
                <Card className="p-8 md:col-span-2">
                  <h3 className="text-2xl font-bold mb-4 text-zinc-800 dark:text-white">Galeria de Fotos do Evento</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {evento.galleryImages.map((imgUrl, index) => (
                      <motion.div
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => openGalleryModal(imgUrl)}
                        whileHover={{ scale: 1.05 }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Foto ${index + 1} do evento ${evento.name}`}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        />
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

            <Card className="p-8">
              <h3 className="text-2xl font-bold mb-4 text-zinc-800 dark:text-white">Perguntas Frequentes</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-zinc-700 dark:text-white">Preciso ter experiência em pista?</p>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    Não, nossos Track Days são abertos para iniciantes. Temos instrutores e baterias separadas por nível de
                    experiência.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-700 dark:text-white">Qual a política de cancelamento?</p>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    Cancelamentos com até 7 dias de antecedência têm reembolso integral.
                  </p>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-zinc-800 dark:text-white">Galeria de Membros</h3>
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">Veja as fotos enviadas por outros participantes!</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="w-full h-24 bg-zinc-200 dark:bg-zinc-800 rounded-md flex items-center justify-center text-zinc-400">
                    <ImageIcon size={24} />
                  </div>
                </div>
              </div>
            </Card>
            <ReviewSection eventoId={evento.id} user={user} db={db} />
          </div>
          <AssistenteIaPreparacao eventoName={evento.name} />
          <div className="text-center mt-12">
            <Button onClick={() => onNavigate("events")} variant="secondary">
              Voltar para todos os eventos
            </Button>
          </div>
          <ModalGaleria
            isOpen={isGalleryModalOpen}
            onClose={() => setIsGalleryModalOpen(false)}
            imageUrl={selectedGalleryImage}
          />
        </div>
      </div>
    </PageWrapper>
  );
}
