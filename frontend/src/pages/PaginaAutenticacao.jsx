import React, { useState } from "react";
import {
  User,
  Mail,
  KeyRound,
  Shield,
  Calendar,
  Phone,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Card, Button, PageWrapper, Input, Spinner } from "../components/AppPrimitives";

export default function PaginaAutenticacao({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleCpfChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const formattedValue = value
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    setCpf(formattedValue);
    validateField("cpf", formattedValue);
  };

  const validateField = (name, value) => {
    let errorMsg = "";
    if (name === "fullName" && !value) {
      errorMsg = "O nome completo é obrigatório.";
    } else if (name === "email") {
      if (!value) errorMsg = "O e-mail é obrigatório.";
      else if (!/\S+@\S+\.\S+/.test(value)) errorMsg = "Formato de e-mail inválido.";
    } else if (name === "password") {
      if (!value) errorMsg = "A senha é obrigatória.";
      else if (value.length < 6) errorMsg = "A senha deve ter no mínimo 6 caracteres.";
    } else if (name === "cpf" && (!value || value.length < 14)) {
      errorMsg = "CPF inválido.";
    } else if (name === "dob" && !value) {
      errorMsg = "A data de nascimento é obrigatória.";
    }

    setFormErrors((prev) => ({ ...prev, [name]: errorMsg }));
  };

  const handleInputChange = (setter, name) => (e) => {
    setter(e.target.value);
    validateField(name, e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess(userCredential.user);
      } else {
        if (!fullName || !cpf || !dob) {
          setError("Por favor, preencha todos os campos de registro.");
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });

        const userDocRef = doc(db, "users", userCredential.user.uid);
        await setDoc(userDocRef, { fullName, email, cpf, dob, phone });

        onLoginSuccess({ ...userCredential.user, displayName: fullName });
      }
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "Este email já está em uso."
          : err.code === "auth/wrong-password" || err.code === "auth/user-not-found"
            ? "Email ou senha incorretos."
            : "Ocorreu um erro. Tente novamente."
      );
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, "users", result.user.uid);
      await setDoc(userDocRef, {
        fullName: result.user.displayName,
        email: result.user.email,
        createdAt: new Date()
      }, { merge: true });

      onLoginSuccess(result.user);
    } catch (err) {
      console.error("Erro ao autenticar com o Google:", err);
      setError("Erro ao autenticar com o Google.");
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center py-12 px-4 pt-32">
        <Card className="p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-zinc-800 dark:text-white mb-2">
            {isLogin ? "Bem-vindo de volta!" : "Crie sua Conta"}
          </h1>
          <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">
            {isLogin ? "Faça login para continuar." : "É rápido e fácil."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="bg-red-500/10 text-red-500 p-3 rounded-lg text-center text-sm">{error}</p>}

            {!isLogin && (
              <>
                <div>
                  <Input
                    name="fullName"
                    type="text"
                    placeholder="Nome Completo"
                    value={fullName}
                    onChange={handleInputChange(setFullName, "fullName")}
                    icon={User}
                    required={!isLogin}
                  />
                  {formErrors.fullName && <p className="text-red-500 text-xs mt-1">{formErrors.fullName}</p>}
                </div>

                <div>
                  <Input
                    name="cpf"
                    type="text"
                    placeholder="CPF"
                    value={cpf}
                    onChange={handleCpfChange}
                    icon={Shield}
                    maxLength="14"
                    required={!isLogin}
                  />
                  {formErrors.cpf && <p className="text-red-500 text-xs mt-1">{formErrors.cpf}</p>}
                </div>

                <div>
                  <Input
                    name="dob"
                    type="date"
                    value={dob}
                    onChange={handleInputChange(setDob, "dob")}
                    icon={Calendar}
                    required={!isLogin}
                    className="block w-full"
                  />
                  {formErrors.dob && <p className="text-red-500 text-xs mt-1">{formErrors.dob}</p>}
                </div>
                <div>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="Telefone (ex: +5517996133907)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={Phone}
                    required={!isLogin}
                  />
                </div>
              </>
            )}

            <div>
              <Input
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={handleInputChange(setEmail, "email")}
                icon={Mail}
                required
              />
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>

            <div className="relative">
              <Input
                name="password"
                type={passwordVisible ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={handleInputChange(setPassword, "password")}
                icon={KeyRound}
                required
              />
              <button
                type="button"
                onClick={() => setPasswordVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
              >
                {passwordVisible ? <EyeOff /> : <Eye />}
              </button>
              {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full flex items-center justify-center" disabled={isLoading}>
              {isLoading ? <Spinner /> : isLogin ? "Entrar" : "Registrar"}
            </Button>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-50 dark:bg-zinc-950 text-zinc-500">Ou continue com</span>
              </div>
            </div>
            
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
            {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setFormErrors({});
              }}
              className="font-semibold text-violet-600 hover:underline ml-1"
            >
              {isLogin ? "Registre-se" : "Faça Login"}
            </button>
          </p>
        </Card>
      </div>
    </PageWrapper>
  );
}
