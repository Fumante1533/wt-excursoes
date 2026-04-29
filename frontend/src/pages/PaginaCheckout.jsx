import React, { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { MessageSquare, Users, Car } from "lucide-react";
import { Wallet } from "@mercadopago/sdk-react";
import { db, auth } from "../firebaseConfig";
import { Card, Button, PageWrapper, Input, Spinner } from "../components/AppPrimitives";

export default function PaginaCheckout({ cart, user }) {
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const initialPrice = cart.reduce((sum, item) => sum + item.ticket.price * item.quantity, 0);
  const [finalPrice, setFinalPrice] = useState(initialPrice);
  const [couponError, setCouponError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [buyerInfo, setBuyerInfo] = useState({
    fullName: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    cpf: "",
    carPlate: "",
    carModel: "",
    carYear: "",
    carColor: "",
  });
  const [couponDetails, setCouponDetails] = useState(null);
  const [preferenceId, setPreferenceId] = useState(null);

  const totalTickets = cart.reduce((sum, item) => sum + item.quantity, 0);
  const additionalCount = Math.max(0, totalTickets - 1);
  
  const [additionalPassengers, setAdditionalPassengers] = useState(
    Array.from({ length: additionalCount }, () => ({
      fullName: "",
      cpf: "",
      email: "",
      phone: "",
      carPlate: "",
      carModel: "",
      carYear: "",
      carColor: "",
    }))
  );

  const serviceFee = 0;
  const totalPrice = finalPrice + serviceFee;

  const handleBuyerInfoChange = (field, value) => {
    setBuyerInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleCpfChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const formattedValue = value
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    handleBuyerInfoChange("cpf", formattedValue);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.substring(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{5})(\d{4})$/, "$1-$2");
    handleBuyerInfoChange("phone", value);
  };

  const validateCpf = (cpf) => {
    const cpfClean = cpf.replace(/\D/g, "");
    if (cpfClean.length !== 11 || /^(\d)\1+$/.test(cpfClean)) return false;
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cpfClean.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpfClean.substring(10, 11))) return false;
    return true;
  };

  const formatCarPlate = (plate) =>
    String(plate || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError("");
    const codeToFind = couponCode.toUpperCase();
    try {
      const couponsRef = collection(db, "coupons");
      const q = query(couponsRef, where("code", "==", codeToFind));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const couponSnap = querySnapshot.docs[0];
        const couponData = couponSnap.data();

        if (couponData.isActive) {
          let discountValue = 0;
          if (couponData.discountType === "percentage") {
            discountValue = (initialPrice * Number(couponData.value)) / 100;
          } else {
            discountValue = Number(couponData.value);
          }
          setCouponDetails(couponData);
          setDiscount(discountValue);
          setFinalPrice(Math.max(0, initialPrice - discountValue));
        } else {
          setCouponError("Este cupom não está mais ativo.");
        }
      } else {
        setCouponError("Cupom inválido.");
      }
    } catch (err) {
      console.error("Erro ao aplicar cupom:", err);
      setCouponError("Não foi possível aplicar o cupom.");
    }
  };

  const initiatePayment = async () => {
    if (
      !buyerInfo.fullName ||
      !buyerInfo.cpf ||
      !buyerInfo.carPlate ||
      !buyerInfo.carModel ||
      !buyerInfo.carYear ||
      !buyerInfo.carColor
    ) {
      setError("Por favor, preencha seus dados e as informações do carro.");
      return;
    }
    if (!validateCpf(buyerInfo.cpf)) {
      setError("O CPF digitado é inválido. Por favor, verifique.");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      const firstItem = cart[0];
      // Usa auth.currentUser para garantir acesso ao método getIdToken() do SDK Firebase
      // (o prop `user` pode ser um plain object sem os métodos do SDK)
      let token = "";
      try {
        const currentUser = auth?.currentUser;
        if (currentUser && typeof currentUser.getIdToken === "function") {
          token = await currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("Não foi possível obter o token de autenticação:", tokenErr);
      }

      const response = await fetch(`${backendUrl}/api/payment/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          evento: firstItem.evento,
          ticket: { ...firstItem.ticket, price: totalPrice },
          buyerInfo,
          carInfo: {
            plate: formatCarPlate(buyerInfo.carPlate),
            model: buyerInfo.carModel,
            year: buyerInfo.carYear,
            color: buyerInfo.carColor,
          },
          additionalPassengers: additionalPassengers.map(p => ({
            ...p,
            carPlate: formatCarPlate(p.carPlate)
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao criar a preferência de pagamento.");
      }

      const data = await response.json();
      setPreferenceId(data.id);
    } catch (err) {
      console.error("ERRO DETALHADO:", err);
      setError(err.message || "Não foi possível iniciar o pagamento. Tente novamente mais tarde.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center py-12 px-4 pt-32">
        <Card className="p-8 max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-center text-zinc-800 dark:text-white mb-2">Finalizar Inscrição</h1>
          <p className="text-center text-zinc-500 dark:text-zinc-400 mb-8">Você está a um passo do seu próximo evento!</p>

          <div className="space-y-4 mb-8">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-yellow-500/10 dark:bg-zinc-800/50 border-l-4 border-yellow-500 p-4 rounded-r-lg"
              >
                <h2 className="font-bold text-lg text-yellow-800 dark:text-yellow-300">{item.evento.name}</h2>
                <p className="text-yellow-700 dark:text-yellow-400">
                  Inscrição: {item.ticket.type} (x{item.quantity})
                </p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4">Seus Dados</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Nome Completo"
                  value={buyerInfo.fullName}
                  onChange={(e) => handleBuyerInfoChange("fullName", e.target.value)}
                  required
                />
                <Input
                  placeholder="E-mail"
                  type="email"
                  value={buyerInfo.email}
                  onChange={(e) => handleBuyerInfoChange("email", e.target.value)}
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Telefone / WhatsApp"
                  value={buyerInfo.phone}
                  onChange={handlePhoneChange}
                  maxLength="15"
                  required
                />
                <Input placeholder="CPF" value={buyerInfo.cpf} onChange={handleCpfChange} maxLength="14" required />
              </div>
              <h4 className="text-lg font-semibold pt-4 border-t dark:border-zinc-700">Dados do Carro Principal</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Placa (ex: ABC1D23)"
                  value={buyerInfo.carPlate}
                  onChange={(e) => handleBuyerInfoChange("carPlate", formatCarPlate(e.target.value))}
                  required
                  maxLength="7"
                />
                <Input
                  placeholder="Modelo (ex: Golf GTI)"
                  value={buyerInfo.carModel}
                  onChange={(e) => handleBuyerInfoChange("carModel", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  placeholder="Ano (ex: 2022)"
                  type="number"
                  value={buyerInfo.carYear}
                  onChange={(e) => handleBuyerInfoChange("carYear", e.target.value)}
                  required
                />
                <Input
                  placeholder="Cor (ex: Preto)"
                  value={buyerInfo.carColor}
                  onChange={(e) => handleBuyerInfoChange("carColor", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {totalTickets > 1 && (
            <div className="mb-8 space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Car size={24} /> Veículos Adicionais
              </h3>
              {additionalPassengers.map((passenger, idx) => (
                <div key={idx} className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <h4 className="font-semibold mb-3">Motorista / Veículo {idx + 2}</h4>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <Input
                      placeholder="Nome Completo (Motorista)"
                      value={passenger.fullName}
                      onChange={(e) => {
                        const newPass = [...additionalPassengers];
                        newPass[idx].fullName = e.target.value;
                        setAdditionalPassengers(newPass);
                      }}
                      required
                    />
                    <Input
                      placeholder="CPF"
                      value={passenger.cpf}
                      maxLength="14"
                      onChange={(e) => {
                        const newPass = [...additionalPassengers];
                        let val = e.target.value.replace(/\D/g, "");
                        val = val.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                        newPass[idx].cpf = val;
                        setAdditionalPassengers(newPass);
                      }}
                      required
                    />
                  </div>
                  <h5 className="text-sm font-semibold mb-2 text-zinc-500">Dados do Veículo {idx + 2}</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Input
                      placeholder="Placa"
                      value={passenger.carPlate}
                      maxLength="7"
                      onChange={(e) => {
                        const newPass = [...additionalPassengers];
                        newPass[idx].carPlate = formatCarPlate(e.target.value);
                        setAdditionalPassengers(newPass);
                      }}
                      required
                    />
                    <Input
                      placeholder="Modelo"
                      value={passenger.carModel}
                      onChange={(e) => {
                        const newPass = [...additionalPassengers];
                        newPass[idx].carModel = e.target.value;
                        setAdditionalPassengers(newPass);
                      }}
                      required
                    />
                    <Input
                      placeholder="Ano"
                      type="number"
                      value={passenger.carYear}
                      onChange={(e) => {
                        const newPass = [...additionalPassengers];
                        newPass[idx].carYear = e.target.value;
                        setAdditionalPassengers(newPass);
                      }}
                      required
                    />
                    <Input
                      placeholder="Cor"
                      value={passenger.carColor}
                      onChange={(e) => {
                        const newPass = [...additionalPassengers];
                        newPass[idx].carColor = e.target.value;
                        setAdditionalPassengers(newPass);
                      }}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6">
            <label className="font-semibold text-zinc-600 dark:text-zinc-300 mb-2 block">Cupom de Desconto</label>
            <div className="flex gap-2">
              <Input placeholder="CÓDIGO" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
              <Button onClick={handleApplyCoupon} variant="secondary">
                Aplicar
              </Button>
            </div>
            {couponError && <p className="text-red-500 text-sm mt-2">{couponError}</p>}
          </div>

          <div className="mt-8 pt-6 border-t dark:border-zinc-700 space-y-2 text-right">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
              <span>Subtotal</span> <span>R$ {initialPrice.toFixed(2)}</span>
            </div>
            {discount > 0 && couponDetails && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>
                  Desconto ({couponDetails.value}
                  {couponDetails.discountType === "percentage" ? "%" : ""})
                </span>
                <span>- R$ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-zinc-800 dark:text-white">
              <span>Total</span>
              <span>R$ {totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {error && <p className="bg-red-500/10 text-red-500 p-3 rounded-lg text-center text-sm my-4">{error}</p>}

          {!preferenceId ? (
            <Button onClick={initiatePayment} disabled={isProcessing} className="w-full mt-8 text-lg">
              {isProcessing ? (
                <>
                  <Spinner /> Preparando pagamento...
                </>
              ) : (
                `Pagar R$ ${totalPrice.toFixed(2)}`
              )}
            </Button>
          ) : (
            <div className="mt-8">
              <Wallet initialization={{ preferenceId }} />
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
