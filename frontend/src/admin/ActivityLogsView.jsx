import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { motion } from "framer-motion";
import { Activity, Clock, User } from "lucide-react";

export default function ActivityLogsView({ db }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState("activity_logs");

  useEffect(() => {
    if (!db) return;
    setIsLoading(true);
    const q = query(
      collection(db, activeType),
      orderBy("timestamp", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, activeType]);

  const formatLogDate = (value) => {
    if (!value) return "Data desconhecida";
    if (typeof value.toDate === "function") return value.toDate().toLocaleString("pt-BR");
    if (value._seconds) return new Date(value._seconds * 1000).toLocaleString("pt-BR");
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Data desconhecida" : parsed.toLocaleString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 text-zinc-400">
        <Activity className="animate-spin mr-3" /> Carregando logs...
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Activity className="text-violet-500" />
          Logs de Atividades
        </h2>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveType("activity_logs")}
          className={`px-4 py-2 rounded-md text-sm font-bold ${activeType === "activity_logs" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}
        >
          Atividades
        </button>
        <button
          onClick={() => setActiveType("system_logs")}
          className={`px-4 py-2 rounded-md text-sm font-bold ${activeType === "system_logs" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300 border border-zinc-700"}`}
        >
          Erros do sistema
        </button>
      </div>

      <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto border border-zinc-700">
        <table className="w-full text-left text-zinc-300 min-w-[600px]">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-700">
              <th className="p-4">Data/Hora</th>
              <th className="p-4">Administrador</th>
              <th className="p-4">Ação</th>
              <th className="p-4">Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-zinc-500">
                  Nenhuma atividade registrada ainda.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/30">
                  <td className="p-4 text-sm font-mono text-zinc-400 flex items-center gap-2">
                    <Clock size={14} />
                    {formatLogDate(log.timestamp)}
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <User size={14} className="text-blue-400" />
                    <span className="font-semibold text-white">{log.adminEmail || log.source || "Sistema"}</span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-zinc-700 rounded-md text-xs font-bold text-violet-300 border border-zinc-600">
                      {log.action || log.level || "LOG"}
                    </span>
                  </td>
                  <td className="p-4 text-sm">{log.details || log.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
