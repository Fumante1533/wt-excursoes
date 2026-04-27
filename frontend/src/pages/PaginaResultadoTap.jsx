import React, { useEffect } from 'react';
import { auth } from '../firebaseConfig';

const Spinner = () => (
  <svg
    className="animate-spin h-10 w-10 text-current mx-auto"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
  </svg>
);

const PaginaResultadoTap = ({ onNavigate }) => {
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const data = {};
        for (const [k, v] of params.entries()) data[k] = v;

        const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
        if (!backendUrl) {
          onNavigate('error', { orderDetails: data });
          return;
        }

        if (!auth) {
          onNavigate('error', { orderDetails: data });
          return;
        }

        const user = auth.currentUser;
        if (!user) {
          onNavigate('error', { orderDetails: data });
          return;
        }
        const token = await user.getIdToken();

        const resp = await fetch(`${backendUrl}/api/payment/tap_result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        const json = await resp.json().catch(() => ({}));
        if (resp.ok && json && json.ok) {
          onNavigate('success', { orderDetails: data });
        } else {
          onNavigate('error', { orderDetails: data });
        }
      } catch (err) {
        console.error('Erro ao processar TapResult:', err);
        onNavigate('error', { orderDetails: {} });
      }
    })();
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-center">
        <Spinner />
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Processando resultado do pagamento...</p>
      </div>
    </div>
  );
};

export default PaginaResultadoTap;
