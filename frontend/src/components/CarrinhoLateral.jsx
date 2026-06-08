import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ShoppingBag, MinusCircle, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "./AppPrimitives";
import { withUploadCacheBust } from "../utils/imageUrl";

export default function CarrinhoLateral({ isOpen, onClose, cart, onUpdateQuantity, onRemove, onNavigate }) {
  const total = cart.reduce((sum, item) => sum + item.ticket.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 w-full max-w-md h-full bg-white dark:bg-zinc-900 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-2xl font-bold">Meu Carrinho</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                <ShoppingBag size={48} className="text-zinc-400 mb-4" />
                <p className="text-lg font-semibold">Seu carrinho está vazio.</p>
                <p className="text-zinc-500">Adicione inscrições de eventos para vê-las aqui.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <img src={withUploadCacheBust(item.evento.image)} alt={item.evento.name} loading="lazy" decoding="async" className="w-24 h-24 object-cover rounded-lg" />
                    <div className="flex-grow">
                      <p className="font-bold">{item.evento.name}</p>
                      <p className="text-sm text-zinc-500">{item.ticket.type}</p>
                      <p className="font-semibold text-yellow-500">R$ {item.ticket.price.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-700"
                        >
                          <MinusCircle size={16} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-700"
                        >
                          <PlusCircle size={16} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="self-start p-1 text-zinc-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-2xl font-bold text-yellow-400">R$ {total.toFixed(2)}</p>
                </div>
                <Button
                  onClick={() => {
                    onClose();
                    onNavigate("checkout", { cart });
                  }}
                  className="w-full"
                >
                  Finalizar Inscrição
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
