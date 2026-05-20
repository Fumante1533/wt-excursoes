import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { collection, getDocs, query, collectionGroup } from "firebase/firestore";
import { Trophy, Medal, Award, Star, Ticket, TrendingUp } from "lucide-react";
import { PageWrapper } from "../components/AppPrimitives";
import { db } from "../firebaseConfig";

const MEDALS = [
  { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-500/30" },
  { icon: Medal, color: "text-zinc-300", bg: "bg-zinc-400/10 border-zinc-500/30" },
  { icon: Award, color: "text-amber-600", bg: "bg-amber-700/10 border-amber-700/30" },
];

export default function PaginaRanking({ onNavigate }) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const build = async () => {
      try {
        // Busca todos os pedidos pagos via collectionGroup
        const ordersSnap = await getDocs(
          query(collectionGroup(db, "orders"))
        );

        // Busca dados de todos os usuários
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap = {};
        usersSnap.forEach((d) => { usersMap[d.id] = d.data(); });

        // Agrupa pedidos pagos por userId
        const scoreMap = {};
        ordersSnap.forEach((d) => {
          const data = d.data();
          if (data.status !== "Pago") return;
          const userId = d.ref.parent.parent?.id;
          if (!userId || userId.startsWith("guest_")) return;
          if (!scoreMap[userId]) {
            scoreMap[userId] = {
              userId,
              displayName: usersMap[userId]?.displayName || "Membro",
              photoURL: usersMap[userId]?.photoURL || null,
              totalEvents: 0,
              totalSpent: 0,
              events: new Set(),
            };
          }
          scoreMap[userId].totalEvents += 1;
          scoreMap[userId].totalSpent += Number(data.price || 0);
          if (data.eventoId) scoreMap[userId].events.add(data.eventoId);
        });

        const list = Object.values(scoreMap)
          .map((m) => ({ ...m, uniqueEvents: m.events.size }))
          .sort((a, b) => b.uniqueEvents - a.uniqueEvents || b.totalSpent - a.totalSpent)
          .slice(0, 20);

        setRanking(list);
      } catch (err) {
        console.error("Erro ao montar ranking:", err);
      } finally {
        setLoading(false);
      }
    };
    build();
  }, []);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-950 pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-5 rounded-2xl">
                <Trophy size={48} className="text-yellow-400" />
              </div>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2">Hall da Fama</h1>
            <p className="text-zinc-400 text-lg">
              Os membros mais engajados do Itajobi Cars Club
            </p>
          </motion.div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-zinc-800/50 rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Star size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum membro no ranking ainda. Participe de eventos!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ranking.map((member, index) => {
                const Medal = MEDALS[index]?.icon || Star;
                const medalColor = MEDALS[index]?.color || "text-zinc-500";
                const medalBg = MEDALS[index]?.bg || "bg-zinc-800/50 border-zinc-700/50";
                const isTop3 = index < 3;

                return (
                  <motion.div
                    key={member.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-4 rounded-xl p-4 border transition-all ${
                      isTop3
                        ? `${medalBg} scale-[1.01]`
                        : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Posição */}
                    <div className="w-12 text-center">
                      {isTop3 ? (
                        <Medal size={28} className={medalColor} />
                      ) : (
                        <span className="text-zinc-500 font-bold text-lg">#{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0 ${
                      isTop3
                        ? "bg-gradient-to-br from-yellow-500 to-amber-600 text-zinc-900"
                        : "bg-gradient-to-br from-violet-600 to-purple-500 text-white"
                    }`}>
                      {member.photoURL ? (
                        <img src={member.photoURL} alt={member.displayName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.displayName.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Nome */}
                    <div className="flex-grow">
                      <p className={`font-bold ${isTop3 ? "text-white text-lg" : "text-zinc-200"}`}>
                        {member.displayName}
                      </p>
                      <p className="text-zinc-500 text-sm">Membro do clube</p>
                    </div>

                    {/* Stats */}
                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-1 text-yellow-400 font-bold">
                        <Ticket size={14} />
                        <span>{member.uniqueEvents} evento{member.uniqueEvents !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-zinc-500 text-xs">
                        <TrendingUp size={12} />
                        <span>{member.totalEvents} inscrição{member.totalEvents !== 1 ? "ões" : ""}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <button
              onClick={() => onNavigate("events")}
              className="bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-bold px-8 py-3 rounded-xl transition-colors"
            >
              🚗 Participar de Eventos
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
