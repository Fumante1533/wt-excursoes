// src/admin/BlogManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const BlogManagement = ({ db }) => {
    const [posts, setPosts] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const [editingPost, setEditingPost] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'blogPosts'), (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    }, [db]);

    const handleSavePost = async (e) => {
        e.preventDefault();
        const postData = {
            title,
            content,
            author,
            imageUrl,
            updatedAt: serverTimestamp(),
        };

        if (editingPost) {
            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'blogPosts', editingPost.id), postData);
            setEditingPost(null);
        } else {
            await addDoc(collection(db, 'blogPosts'), {
                ...postData,
                createdAt: serverTimestamp(),
            });
        }
        
        setTitle('');
        setContent('');
        setAuthor('');
        setImageUrl('');
    };

    const handleEdit = (post) => {
        setEditingPost(post);
        setTitle(post.title);
        setContent(post.content);
        setAuthor(post.author);
        setImageUrl(post.imageUrl);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Tem certeza que deseja excluir este post?")) {
            const { doc, deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'blogPosts', id));
        }
    };

    return (
        <div className="max-w-4xl">
            <h2 className="text-3xl font-bold text-white mb-6">Gerenciar Blog</h2>
            <form onSubmit={handleSavePost} className="bg-zinc-800 p-6 rounded-lg mb-8 space-y-4 border border-zinc-700">
                <h3 className="text-xl font-bold text-violet-400">
                    {editingPost ? 'Editar Post' : 'Novo Post'}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" className="bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600 focus:border-violet-500 outline-none" required />
                    <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autor" className="bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600 focus:border-violet-500 outline-none" required />
                </div>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="URL da Imagem de Capa" className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600 focus:border-violet-500 outline-none" required />
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Conteúdo do post (Markdown ou Texto)..." rows="8" className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600 focus:border-violet-500 outline-none" required></textarea>
                
                <div className="flex gap-4">
                    <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-lg font-bold transition-colors">
                        {editingPost ? 'Salvar Alterações' : 'Publicar Post'}
                    </button>
                    {editingPost && (
                        <button type="button" onClick={() => {
                            setEditingPost(null);
                            setTitle('');
                            setContent('');
                            setAuthor('');
                            setImageUrl('');
                        }} className="bg-zinc-600 hover:bg-zinc-500 text-white p-3 rounded-lg font-bold transition-colors">
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Posts Publicados</h3>
                {posts.length === 0 ? (
                    <p className="text-zinc-500">Nenhum post encontrado no banco de dados.</p>
                ) : (
                    posts.map(post => (
                        <div key={post.id} className="bg-zinc-800 p-4 rounded-lg flex items-center justify-between border border-zinc-700/50 hover:border-zinc-600 transition-colors">
                            <div className="flex items-center gap-4">
                                {post.imageUrl && <img src={post.imageUrl} className="w-16 h-16 object-cover rounded" alt="" />}
                                <div>
                                    <p className="font-bold text-white">{post.title}</p>
                                    <p className="text-sm text-zinc-400">por {post.author}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(post)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors">Editar</button>
                                <button onClick={() => handleDelete(post.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">Excluir</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BlogManagement;