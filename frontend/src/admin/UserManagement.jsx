// src/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

const UserManagement = ({ db }) => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const usersRef = collection(db, 'users');
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    if (isLoading) return <p>Carregando usuários...</p>;

    return (
        <div>
            <h2 className="text-3xl font-bold text-white mb-6">Gerenciar Usuários</h2>
            <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto">
                <table className="w-full text-left text-zinc-300">
                    <thead className="bg-zinc-900/50">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">CPF</th>
                            <th className="p-4">Data de Nascimento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-zinc-700 hover:bg-zinc-700/50">
                                <td className="p-4 font-semibold text-white">{user.fullName}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">{user.cpf}</td>
                                <td className="p-4">{user.dob}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;