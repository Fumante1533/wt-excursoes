// src/pages/PaginaBlog.jsx
import React from 'react';

const PaginaBlog = ({ onNavigate, posts }) => {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-12">Nosso Blog</h1>
                <div className="space-y-8">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow" onClick={() => onNavigate('blogPost', { postId: post.id })}>
                            <img src={post.imageUrl || 'https://via.placeholder.com/800x400'} alt={post.title} loading="lazy" decoding="async" className="w-full h-64 object-cover" />
                            <div className="p-6">
                                <h2 className="text-2xl font-bold text-zinc-800 dark:text-white mb-2">{post.title}</h2>
                                <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                                    Por {post.author} em {post.createdAt?.toDate().toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-300">{post.summary || `${post.content.substring(0, 150)}...`}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PaginaBlog;
