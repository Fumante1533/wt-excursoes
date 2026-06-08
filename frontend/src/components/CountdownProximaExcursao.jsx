import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Countdown regressivo para o próximo evento.
 * @param {Object} excursion - objeto do evento com date (ISO) e time (HH:mm)
 */
export default function CountdownProximaExcursao({ excursion, onNavigate }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!excursion) return;

    // Monta a data/hora alvo
    const timeStr = excursion.time
      ? excursion.time.replace("h", ":").padEnd(5, "0")
      : "00:00";
    const alvo = new Date(`${excursion.date}T${timeStr}:00`);

    const tick = () => {
      const diff = alvo - new Date();
      if (diff <= 0) {
        setTimeLeft({ dias: 0, horas: 0, mins: 0, segs: 0 });
        return;
      }
      setTimeLeft({
        dias:  Math.floor(diff / (1000 * 60 * 60 * 24)),
        horas: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins:  Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        segs:  Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [excursion]);

  if (!excursion || !timeLeft) return null;

  const pad = (n) => String(n).padStart(2, "0");

  const unitClass =
    "flex flex-col items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-5 min-w-[90px]";
  const numClass = "text-4xl md:text-5xl font-extrabold text-violet-400 tabular-nums";
  const labelClass = "text-xs text-zinc-300 mt-1 uppercase tracking-widest";

  return (
    <section className="py-20 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/40 rounded-full px-4 py-1.5 text-violet-400 text-sm font-semibold mb-6">
            ⏱️ CONTAGEM REGRESSIVA
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            Não perca o <span className="text-violet-400">próximo encontro!</span>
          </h2>
          <p className="text-zinc-400 mb-10">
            📍 Próximo evento:{" "}
            <span className="text-white font-semibold">{excursion.name}</span>{" "}
            —{" "}
            {new Date(excursion.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
          </p>

          <div className="flex items-center justify-center gap-3 md:gap-5 flex-wrap">
            <div className={unitClass}>
              <span className={numClass}>{pad(timeLeft.dias)}</span>
              <span className={labelClass}>Dias</span>
            </div>
            <span className="text-4xl font-bold text-violet-500 pb-4">:</span>
            <div className={unitClass}>
              <span className={numClass}>{pad(timeLeft.horas)}</span>
              <span className={labelClass}>Horas</span>
            </div>
            <span className="text-4xl font-bold text-violet-500 pb-4">:</span>
            <div className={unitClass}>
              <span className={numClass}>{pad(timeLeft.mins)}</span>
              <span className={labelClass}>Minutos</span>
            </div>
            <span className="text-4xl font-bold text-violet-500 pb-4">:</span>
            <div className={unitClass}>
              <span className={numClass}>{pad(timeLeft.segs)}</span>
              <span className={labelClass}>Segundos</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate("eventDetail", { eventId: excursion.id })}
            className="mt-12 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl text-lg hover:shadow-2xl hover:shadow-violet-500/30 hover:-translate-y-1 transition-all"
          >
            🎟️ Garantir Minha Vaga
          </button>
        </motion.div>
      </div>
    </section>
  );
}
