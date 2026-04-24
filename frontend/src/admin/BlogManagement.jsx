// src/admin/BlogManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const BlogManagement = ({ db }) => {
    const [posts, setPosts] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'blogPosts'), (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    }, [db]);

    const handleAddPost = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, 'blogPosts'), {
            title,
            content,
            author,
            imageUrl,
            createdAt: serverTimestamp(),
        });
        setTitle('');
        setContent('');
        setAuthor('');
        setImageUrl('');
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Gerenciar Blog</h2>
            <form onSubmit={handleAddPost} className="bg-zinc-800 p-6 rounded-lg mb-8 space-y-4">
                <h3 className="text-xl font-bold">Novo Post</h3>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="w-full bg-zinc-700 text-white p-2 rounded"/>
                <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autor" className="w-full bg-zinc-700 text-white p-2 rounded"/>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL da Imagem de Capa" className="w-full bg-zinc-700 text-white p-2 rounded"/>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Conteúdo do post..." rows="10" className="w-full bg-zinc-700 text-white p-2 rounded"></textarea>
                <button type="submit" className="bg-violet-600 text-white p-2 rounded font-bold">Publicar Post</button>
            </form>
            <div>
                <h3 className="text-xl font-bold mb-4">Posts Publicados</h3>
                <div className="space-y-4">
                    {posts.map(post => (
                        <div key={post.id} className="bg-zinc-800 p-4 rounded-lg">
                            <p className="font-bold">{post.title}</p>
                            <p className="text-sm text-zinc-400">por {post.author}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogManagement;