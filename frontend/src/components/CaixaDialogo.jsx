import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function CaixaDialogo({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-zinc-800 rounded-lg shadow-xl p-8 max-w-lg w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-700">
            <X className="text-zinc-400" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
