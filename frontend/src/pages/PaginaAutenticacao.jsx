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
                    placeholder="Telefone (ex: +5511999999999)"
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
