// src/components/ReviewSection.jsx
import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';

const StarRating = ({ rating, setRating }) => (
    <div className="flex items-center">
        {[...Array(5)].map((_, index) => {
            const ratingValue = index + 1;
            return (
                <button
                    key={index}
                    type="button"
                    className="focus:outline-none"
                    onClick={() => setRating(ratingValue)}
                >
                    <Star
                        size={24}
                        className={`transition-colors ${ratingValue <= rating ? 'text-yellow-400' : 'text-zinc-300 dark:text-zinc-600'}`}
                        fill={ratingValue <= rating ? 'currentColor' : 'none'}
                    />
                </button>
            );
        })}
    </div>
);


const ReviewSection = ({ eventoId, user, db }) => {
    const [reviews, setReviews] = useState([]);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const reviewsQuery = query(collection(db, 'reviews'), where('eventoId', '==', eventoId));
        const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
            const rawReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            rawReviews.sort((a, b) => {
                const timeA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
                const timeB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
                return timeB - timeA;
            });
            setReviews(rawReviews);
        });
        return unsubscribe;
    }, [eventoId, db]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Você precisa estar logado para avaliar.');
            return;
        }
        if (rating === 0 || comment.trim() === '') {
            setError('Por favor, adicione uma nota e um comentário.');
            return;
        }

        try {
            await addDoc(collection(db, 'reviews'), {
                eventoId,
                userId: user.uid,
                userName: user.displayName,
                rating,
                comment,
                createdAt: serverTimestamp(),
            });
            setRating(0);
            setComment('');
            setError('');
        } catch {
            setError('Ocorreu um erro ao enviar sua avaliação.');
        }
    };

    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 'N/A';

    return (
        <div className="mt-12">
            <h2 className="text-3xl font-bold text-zinc-800 dark:text-white mb-6">Avaliações de Participantes</h2>
            
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg mb-8">
                <div className="flex items-center gap-4 mb-4">
                     <h3 className="text-xl font-bold">Nota Média: {averageRating}</h3>
                     <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={20} className={i < Math.round(averageRating) ? 'text-yellow-400' : 'text-zinc-300'} fill={i < Math.round(averageRating) ? 'currentColor' : 'none'}/>)}</div>
                     <span className="text-zinc-500">({reviews.length} avaliações)</span>
                </div>
            </div>

            {user && (
                 <motion.div layout className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-lg mb-8">
                    <h3 className="text-xl font-bold mb-4">Deixe sua avaliação</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="font-semibold block mb-2">Sua nota:</label>
                            <StarRating rating={rating} setRating={setRating} />
                        </div>
                        <div className="mb-4">
                             <label className="font-semibold block mb-2">Seu comentário:</label>
                             <textarea 
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                rows="4"
                                className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-violet-500 border-transparent focus:border-transparent"
                                placeholder="Conte como foi sua experiência..."
                             ></textarea>
                        </div>
                        {error && <p className="text-red-500 mb-4">{error}</p>}
                        <button type="submit" className="px-6 py-3 font-bold rounded-lg bg-violet-600 text-white">Enviar Avaliação</button>
                    </form>
                </motion.div>
            )}

            <div className="space-y-6">
                {reviews.map(review => (
                    <div key={review.id} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-md">
                        <div className="flex items-center mb-2">
                            <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} size={18} className={i < review.rating ? 'text-yellow-400' : 'text-zinc-300'} fill={i < review.rating ? 'currentColor' : 'none'}/>)}</div>
                            <h4 className="font-bold ml-4">{review.userName}</h4>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-300">{review.comment}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReviewSection;