import React, { useState } from "react";
import { LogIn, Mail, KeyRound } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { Card, Button, PageWrapper, Input, Spinner } from "../components/AppPrimitives";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

export default function PaginaLoginAdmin({ onAdminLoginSuccess, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const normalizedInputEmail = (email || "").trim().toLowerCase();
    const normalizedAdminEmail = (ADMIN_EMAIL || "").trim().toLowerCase();

    if (normalizedAdminEmail && normalizedInputEmail !== normalizedAdminEmail) {
      setError("Acesso negado. Este não é um email de administrador.");
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, normalizedInputEmail, password);
      const cb = typeof onAdminLoginSuccess === "function" ? onAdminLoginSuccess : onLogin;
      if (typeof cb === "function") {
        cb();
      } else {
        console.warn("Admin login succeeded but no callback (onAdminLoginSuccess/onLogin) was provided.");
      }
    } catch (err) {
      console.error("Erro ao autenticar admin:", err.code, err.message || err);
      const code = err && err.code ? err.code : "";
      if (code === "auth/user-not-found") {
        setError("Usuário não encontrado. Verifique o email.");
      } else if (code === "auth/wrong-password") {
        setError("Senha incorreta.");
      } else if (code === "auth/invalid-email") {
        setError("Email inválido.");
      } else if (code === "auth/network-request-failed") {
        setError("Erro de rede. Verifique sua conexão.");
      } else if (code === "auth/operation-not-allowed") {
        setError("Provider de Email/Senha não está habilitado no Firebase.");
      } else {
        setError("Email ou senha de administrador inválidos.");
      }
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img src="/assets/icon.png" alt="WT Icon" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mt-4">Painel Administrativo</h1>
            <p className="text-violet-400">Acesso restrito.</p>
          </div>
          <Card className="p-8 bg-zinc-800/50 border border-zinc-800">
            <form onSubmit={handleLogin}>
              {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4 text-center">{error}</p>}
              <div className="space-y-6">
                <Input
                  type="email"
                  placeholder="admin@itajobicars.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-700 text-white border-zinc-600 focus:border-violet-500"
                  icon={Mail}
                  required
                />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-700 text-white border-zinc-600 focus:border-violet-500"
                  icon={KeyRound}
                  required
                />
                <Button type="submit" className="w-full flex items-center justify-center" disabled={isLoading}>
                  {isLoading ? (
                    <Spinner />
                  ) : (
                    <>
                      <LogIn className="mr-2" /> Entrar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
