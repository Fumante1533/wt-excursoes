import React from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock } from "lucide-react";
import WishlistButton from "./WishlistButton";
import { Card, Button } from "./AppPrimitives";

export const CartaoEvento = ({ event, onNavigate, index = 0, user, db }) => {
  const tagColors = {
    "Vagas Limitadas": "bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-500 border-amber-300 dark:border-amber-400/30",
    "Novo": "bg-cyan-100 dark:bg-cyan-400/20 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-400/30",
    "Clássicos": "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-400/30",
    "Exclusivo": "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-400/30",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="flex flex-col group h-full hover:shadow-2xl dark:hover:shadow-yellow-500/10 hover:-translate-y-2 transition-transform duration-300">
        <div className="overflow-hidden relative">
          <img
            src={event.image}
            alt={event.name}
            loading="lazy"
            decoding="async"
            className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent"></div>
          {event.tag && (
            <span
              className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full border ${tagColors[event.tag] || tagColors["Exclusivo"]}`}
            >
              {event.tag}
            </span>
          )}
          {user && db && <WishlistButton userId={user.uid} eventoId={event.id} db={db} />}
        </div>
        <div className="p-6 flex-grow flex flex-col bg-white dark:bg-zinc-900">
          <p className="text-sm font-semibold text-yellow-500 dark:text-yellow-400 mb-1">
            {event.category}
          </p>
          <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">
            {event.name}
          </h3>
          <div className="flex items-center text-zinc-500 dark:text-zinc-400 mb-4 text-sm gap-4">
            <span className="flex items-center gap-2">
              <MapPin size={16} /> {event.location}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={16} />{" "}
              {new Date(event.date).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })}
            </span>
            {event.time && (
              <span className="flex items-center gap-2">
                <Clock size={16} /> {event.time} {event.timeEnd && `às ${event.timeEnd}`}
              </span>
            )}
          </div>
          <p className="text-zinc-600 dark:text-zinc-300 flex-grow mb-6 text-sm">
            {event.description.substring(0, 110)}...
          </p>
          <Button
            onClick={() => onNavigate("eventDetail", { eventId: event.id })}
            className="w-full mt-auto"
          >
            Ver Detalhes
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export const EsqueletoCartaoEvento = () => (
  <Card className="flex flex-col group animate-pulse">
    <div className="w-full h-56 bg-zinc-300 dark:bg-zinc-800"></div>
    <div className="p-6">
      <div className="h-4 w-1/4 bg-zinc-300 dark:bg-zinc-800 rounded-md mb-2"></div>
      <div className="h-6 w-3/4 bg-zinc-300 dark:bg-zinc-800 rounded-md mb-3"></div>
      <div className="h-4 w-1/2 bg-zinc-300 dark:bg-zinc-800 rounded-md mb-4"></div>
      <div className="h-4 w-full bg-zinc-300 dark:bg-zinc-800 rounded-md mb-2"></div>
      <div className="h-4 w-full bg-zinc-300 dark:bg-zinc-800 rounded-md mb-6"></div>
      <div className="h-12 w-full bg-zinc-300 dark:bg-zinc-800 rounded-lg mt-auto"></div>
    </div>
  </Card>
);
