// src/pages/PaginaFaq.jsx
import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FaqItem = ({ faq }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-zinc-200 dark:border-zinc-800">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left py-6"
            >
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">{faq.question}</h3>
                <ChevronDown className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-6 text-zinc-600 dark:text-zinc-300">{faq.answer}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PaginaFaq = ({ faqs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredFaqs = faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-4">Perguntas Frequentes</h1>
                <p className="text-lg text-center text-zinc-600 dark:text-zinc-300 mb-12">Tire suas dúvidas sobre nossas viagens.</p>
                <div className="relative mb-8">
                    <input
                        type="text"
                        placeholder="Buscar por uma dúvida..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full py-3 pl-12 pr-4 bg-white dark:bg-zinc-800 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 focus:border-violet-500"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6">
                    {filteredFaqs.map(faq => <FaqItem key={faq.id} faq={faq} />)}
                </div>
            </div>
        </div>
    );
};

export default PaginaFaq;