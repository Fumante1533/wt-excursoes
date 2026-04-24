import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast'; // NOVO

const WishlistButton = ({ userId, excursionId, db }) => {
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkWishlist = async () => {
            setIsLoading(true);
            const wishlistRef = doc(db, 'users', userId, 'wishlist', String(excursionId));
            const docSnap = await getDoc(wishlistRef);
            setIsInWishlist(docSnap.exists());
            setIsLoading(false);
        };
        checkWishlist();
    }, [userId, excursionId, db]);

    const handleToggleWishlist = async (e) => {
        e.stopPropagation(); // Impede que o clique no botão ative o link do card
        if (isLoading) return;

        const wishlistRef = doc(db, 'users', userId, 'wishlist', String(excursionId));
        if (isInWishlist) {
            await deleteDoc(wishlistRef);
            setIsInWishlist(false);
            toast.success('Removido da lista de desejos!');
        } else {
            await setDoc(wishlistRef, { addedAt: new Date() });
            setIsInWishlist(true);
            toast.success('Adicionado à lista de desejos!');
        }
    };

    return (
        <button
            onClick={handleToggleWishlist}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white hover:bg-black/60 transition-colors"
        >
            <Heart size={20} fill={isInWishlist ? 'currentColor' : 'none'} />
        </button>
    );
};

export default WishlistButton;