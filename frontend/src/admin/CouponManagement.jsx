// src/admin/CouponManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast'; 


const CouponManagement = ({ db }) => {
    const [coupons, setCoupons] = useState([]);
    const [code, setCode] = useState('');
    const [type, setType] = useState('percentage');
    const [value, setValue] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'coupons'), (snapshot) => {
            setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsub;
    }, [db]);

    const handleAddCoupon = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'coupons'), {
                code: code.toUpperCase(),
                discountType: type,
                value: Number(value),
                isActive: true,
            });
            setCode('');
            setValue('');
            toast.success('Cupom criado com sucesso!'); // Notificação de Sucesso
        } catch (error) {
            console.error("Erro detalhado ao criar cupom:", error); // Log de Erro
            toast.error('Erro ao criar o cupom. Verifique o console para detalhes.'); 
        }
    };
    
    const toggleActive = async (coupon) => {
        const couponRef = doc(db, 'coupons', coupon.id);
        try {
            await updateDoc(couponRef, { isActive: !coupon.isActive });
            toast.success(`Cupom ${!coupon.isActive ? 'ativado' : 'inativado'}!`);
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            toast.error('Erro ao alterar status.');
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, 'coupons', id));
            toast.success('Cupom excluído!');
        } catch (error) {
            console.error("Erro ao deletar cupom:", error);
            toast.error('Erro ao excluir o cupom.');
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Gerenciar Cupons</h2>
            <form onSubmit={handleAddCoupon} className="bg-zinc-800 p-6 rounded-lg mb-8 flex gap-4 items-end">
                <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código (ex: ENCONTRO10)" className="bg-zinc-700 text-white p-2 rounded"/>
                <select value={type} onChange={e => setType(e.target.value)} className="bg-zinc-700 text-white p-2 rounded">
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                </select>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="Valor" className="bg-zinc-700 text-white p-2 rounded"/>
                <button type="submit" className="bg-violet-600 text-white p-2 rounded font-bold">Adicionar</button>
            </form>
            
            <div className="bg-zinc-800 rounded-lg shadow-xl">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="flex items-center justify-between p-4 border-b border-zinc-700">
                        <div>
                            <p className="font-bold text-lg">{coupon.code}</p>
                            <p className="text-sm text-zinc-400">
                                {coupon.discountType === 'percentage' ? `${coupon.value}% de desconto` : `R$ ${coupon.value ? coupon.value.toFixed(2) : '0.00'} de desconto`}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => toggleActive(coupon)} className={`px-3 py-1 text-sm rounded-full ${coupon.isActive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                {coupon.isActive ? 'Ativo' : 'Inativo'}
                            </button>
                            <button onClick={() => handleDelete(coupon.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CouponManagement;