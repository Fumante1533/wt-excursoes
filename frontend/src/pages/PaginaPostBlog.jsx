// src/pages/PaginaPostBlog.jsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';

const PaginaPostBlog = ({ onNavigate, post }) => {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <button onClick={() => onNavigate('blog')} className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-semibold mb-8">
                    <ArrowLeft size={18} /> Voltar para o Blog
                </button>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden p-8 md:p-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-zinc-800 dark:text-white mb-4">{post.title}</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                        Por {post.author} em {post.createdAt?.toDate().toLocaleDateString('pt-BR')}
                    </p>
                    <img src={post.imageUrl || 'https://via.placeholder.com/800x400'} alt={post.title} loading="lazy" decoding="async" className="w-full rounded-lg mb-8" />
                    <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                        {post.content}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaginaPostBlog;
