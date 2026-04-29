import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Building2, Link2, Phone, Instagram, Facebook, Plus, Edit, Trash2, Save, X,
} from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Button } from "../components/AppPrimitives";

export default function SponsorManagement({ db }) {
  const [sponsors, setSponsors] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", logoUrl: "", website: "", phone: "", instagram: "", facebook: "", description: "", category: "Patrocinador" });

  const categories = ["Patrocinador Master", "Patrocinador", "Apoiador", "Parceiro"];

  useEffect(() => {
    if (!db) return;
    const ref = collection(db, "sponsors");
    const unsub = onSnapshot(ref, (snap) => {
      setSponsors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [db]);

  const resetForm = () => {
    setForm({ name: "", logoUrl: "", website: "", phone: "", instagram: "", facebook: "", description: "", category: "Patrocinador" });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (sponsor) => {
    setForm({
      name: sponsor.name || "",
      logoUrl: sponsor.logoUrl || "",
      website: sponsor.website || "",
      phone: sponsor.phone || "",
      instagram: sponsor.instagram || "",
      facebook: sponsor.facebook || "",
      description: sponsor.description || "",
      category: sponsor.category || "Patrocinador",
    });
    setEditingId(sponsor.id);
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome do parceiro é obrigatório."); return; }
    try {
      if (editingId) {
        await updateDoc(doc(db, "sponsors", editingId), { ...form, updatedAt: serverTimestamp() });
        toast.success("Parceiro atualizado!");
      } else {
        await addDoc(collection(db, "sponsors"), { ...form, createdAt: serverTimestamp() });
        toast.success("Parceiro adicionado!");
      }
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar parceiro.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este parceiro?")) return;
    try {
      await deleteDoc(doc(db, "sponsors", id));
      toast.success("Parceiro removido.");
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  const categoryColor = {
    "Patrocinador Master": "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
    "Patrocinador": "bg-violet-500/20 text-violet-300 border border-violet-500/40",
    "Apoiador": "bg-blue-500/20 text-blue-300 border border-blue-500/40",
    "Parceiro": "bg-zinc-500/20 text-zinc-300 border border-zinc-500/40",
  };

  const inputClass = "w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:border-violet-500";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Parceiros & Patrocinadores</h2>
        <Button onClick={() => { resetForm(); setIsFormOpen(true); }}>
          <Plus size={16} className="mr-1 inline" /> Novo Parceiro
        </Button>
      </div>

      {/* Formulário */}
      {isFormOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-800 rounded-xl p-6 mb-8 border border-zinc-700"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">{editingId ? "Editar Parceiro" : "Novo Parceiro"}</h3>
            <button onClick={resetForm} className="text-zinc-400 hover:text-white"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-zinc-400 mb-1">Nome *</label>
              <input className={inputClass} placeholder="Nome do parceiro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Categoria</label>
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">URL do Logo</label>
              <input className={inputClass} placeholder="https://..." value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Website</label>
              <input className={inputClass} placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Telefone / WhatsApp</label>
              <input className={inputClass} placeholder="(17) 99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Instagram</label>
              <input className={inputClass} placeholder="@perfil" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Facebook</label>
              <input className={inputClass} placeholder="@pagina" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-zinc-400 mb-1">Descrição</label>
              <textarea className={`${inputClass} h-20 resize-none`} placeholder="Breve descrição do parceiro..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
              <Button type="submit"><Save size={16} className="mr-1 inline" /> Salvar</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Lista */}
      {sponsors.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum parceiro cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((s) => (
            <div key={s.id} className="bg-zinc-800 rounded-xl p-5 border border-zinc-700 hover:border-zinc-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.name} className="w-12 h-12 object-contain rounded-lg bg-white p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-700 flex items-center justify-center">
                      <Building2 size={22} className="text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white">{s.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[s.category] || categoryColor["Parceiro"]}`}>
                      {s.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(s)} className="p-1.5 text-blue-400 hover:bg-zinc-700 rounded-lg transition-colors"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              {s.description && <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{s.description}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"><Link2 size={12} /> Site</a>}
                {s.phone && <a href={`https://wa.me/55${s.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"><Phone size={12} /> WhatsApp</a>}
                {s.instagram && <a href={`https://instagram.com/${s.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300"><Instagram size={12} /> Instagram</a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
