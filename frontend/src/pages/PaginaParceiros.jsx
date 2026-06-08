import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Building2, Phone, Instagram, ExternalLink } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { PageWrapper } from "../components/AppPrimitives";
import { db } from "../firebaseConfig";
import { withUploadCacheBust } from "../utils/imageUrl";

const categoryOrder = ["Patrocinador Master", "Patrocinador", "Apoiador", "Parceiro"];
const categoryStyle = {
  "Patrocinador Master": "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
  "Patrocinador":        "bg-violet-500/15 border-violet-500/40 text-violet-300",
  "Apoiador":            "bg-blue-500/15 border-blue-500/40 text-blue-300",
  "Parceiro":            "bg-zinc-700/50 border-zinc-600/40 text-zinc-300",
};

export default function PaginaParceiros() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, "sponsors");
    const unsub = onSnapshot(ref, (snap) => {
      setSponsors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const grouped = categoryOrder.reduce((acc, cat) => {
    const items = sponsors.filter((s) => s.category === cat || (!s.category && cat === "Parceiro"));
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-950 pt-28 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <span className="inline-block bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              Quem nos apoia
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Nossos Parceiros &<br />
              <span className="text-yellow-400">Patrocinadores</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Cada evento que realizamos é possível graças ao apoio dessas empresas e pessoas incríveis.
              Conheça quem acelera junto com a gente.
            </p>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-zinc-800/50 rounded-xl h-32 animate-pulse" />
              ))}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20 text-zinc-600">
              <Building2 size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-xl">Parceiros em breve!</p>
            </div>
          ) : (
            <div className="space-y-16">
              {Object.entries(grouped).map(([category, items]) => (
                <motion.section
                  key={category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${categoryStyle[category]}`}>
                      {category}
                    </span>
                    <div className="flex-grow h-px bg-zinc-800" />
                  </div>

                  <div className={`grid gap-5 ${
                    category === "Patrocinador Master"
                      ? "grid-cols-1 sm:grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                  }`}>
                    {items.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all duration-300 group ${
                          category === "Patrocinador Master" ? "p-6" : "p-4"
                        }`}
                      >
                        {/* Logo */}
                        <div className={`flex items-center justify-center mb-4 ${
                          category === "Patrocinador Master" ? "h-28" : "h-20"
                        }`}>
                          {s.logoUrl ? (
                            <img
                              src={withUploadCacheBust(s.logoUrl)}
                              alt={s.name}
                              loading="lazy"
                              decoding="async"
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center">
                              <Building2 size={28} className="text-zinc-500" />
                            </div>
                          )}
                        </div>

                        {/* Nome */}
                        <p className={`font-bold text-white text-center mb-1 ${category === "Patrocinador Master" ? "text-xl" : "text-base"}`}>
                          {s.name}
                        </p>

                        {/* Descrição (só master) */}
                        {s.description && category === "Patrocinador Master" && (
                          <p className="text-zinc-400 text-sm text-center mb-3 line-clamp-2">{s.description}</p>
                        )}

                        {/* Links */}
                        <div className="flex justify-center flex-wrap gap-2 mt-3">
                          {s.website && (
                            <a
                              href={s.website}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full transition-colors"
                            >
                              <ExternalLink size={11} /> Site
                            </a>
                          )}
                          {s.phone && (
                            <a
                              href={`https://wa.me/55${s.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 bg-green-500/10 px-2 py-1 rounded-full transition-colors"
                            >
                              <Phone size={11} /> WhatsApp
                            </a>
                          )}
                          {s.instagram && (
                            <a
                              href={`https://instagram.com/${s.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 bg-pink-500/10 px-2 py-1 rounded-full transition-colors"
                            >
                              <Instagram size={11} /> Insta
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          )}

          {/* CTA patrocínio */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-20 text-center bg-gradient-to-br from-violet-900/30 to-yellow-900/20 border border-zinc-800 rounded-2xl p-10"
          >
            <h2 className="text-2xl font-bold text-white mb-3">Quer ser um parceiro?</h2>
            <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
              Entre em contato conosco e faça parte dos eventos que movem a comunidade automotiva da região.
            </p>
            <a
              href="https://wa.me/5517999999999?text=Olá!%20Tenho%20interesse%20em%20ser%20parceiro%20do%20Itajobi%20Cars%20Club."
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-yellow-500 hover:bg-yellow-400 text-zinc-900 font-bold px-8 py-3 rounded-xl transition-colors"
            >
              🤝 Falar sobre Parceria
            </a>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
}
