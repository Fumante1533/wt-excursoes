import React, { useState, useEffect } from "react";
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
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [garageCars, setGarageCars] = useState([]);
  const [selectedGarageCarId, setSelectedGarageCarId] = useState("");

  useEffect(() => {
    const fetchGarage = async () => {
      if (user && db) {
        try {
          const carsCol = collection(db, "users", user.uid, "cars");
          const snap = await getDocs(carsCol);
          setGarageCars(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
          console.error("Erro ao buscar garagem:", err);
        }
      }
    };
    fetchGarage();
  }, [user]);

  useEffect(() => {
    if (!pixData || !pixData.id) return;

    const interval = setInterval(async () => {
      try {
        const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
        
        let token = "";
        try {
          const currentUser = auth?.currentUser;
          if (currentUser && typeof currentUser.getIdToken === "function") {
            token = await currentUser.getIdToken();
          }
        } catch (e) {}

        const response = await fetch(`${backendUrl}/api/payment/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id: pixData.id }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "approved" || data.status === "paid") {
            clearInterval(interval);
            window.location.href = "/success";
          }
        }
      } catch (err) {
        console.error("Erro ao verificar status de pagamento Pix:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [pixData]);

  const handleSelectGarageCar = (carId) => {
    setSelectedGarageCarId(carId);
    if (!carId) return;
    const car = garageCars.find(c => c.id === carId);
    if (car) {
      setBuyerInfo(prev => ({
        ...prev,
        carPlate: car.plate || "",
        carModel: `${car.make || ""} ${car.model || ""}`.trim(),
        carYear: car.year || "",
        carColor: car.color || "",
      }));
    }
  };

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

  const validatePlate = (plate) => {
    const cleanPlate = String(plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleanPlate.length !== 7) return false;
    const regexAntigo = /^[A-Z]{3}[0-9]{4}$/;
    const regexMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
    return regexAntigo.test(cleanPlate) || regexMercosul.test(cleanPlate);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setCouponError("");
    const codeToFind = couponCode.toUpperCase();
    try {
      const q = query(collection(db, "coupons"), where("code", "==", codeToFind));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setCouponError("Cupom inválido.");
        return;
      }

      const couponSnap = querySnapshot.docs[0];
      const couponData = couponSnap.data();

      if (!couponData.isActive) {
        setCouponError("Este cupom não está mais ativo.");
        return;
      }

      // Verifica limite de usos
      if (couponData.maxUses != null && (couponData.usedCount || 0) >= couponData.maxUses) {
        setCouponError("Este cupom já atingiu o limite de usos.");
        return;
      }

      // Verifica restrição de evento
      if (couponData.eventId) {
        const cartEventId = cart[0]?.evento?.id;
        if (cartEventId !== couponData.eventId) {
          setCouponError(`Este cupom é válido apenas para o evento: ${couponData.eventName || couponData.eventId}.`);
          return;
        }
      }

      // Verifica restrição de tipo de ingresso
      if (couponData.ticketTypes?.length > 0) {
        const cartTicketTypes = cart.map(item => item.ticket?.type);
        const hasValidTicket = cartTicketTypes.some(t => couponData.ticketTypes.includes(t));
        if (!hasValidTicket) {
          setCouponError(`Este cupom é válido apenas para: ${couponData.ticketTypes.join(", ")}.`);
          return;
        }
      }

      let discountValue = 0;
      if (couponData.discountType === "percentage") {
        discountValue = (initialPrice * Number(couponData.value)) / 100;
      } else {
        discountValue = Number(couponData.value);
      }

      setCouponDetails({ ...couponData, id: couponSnap.id });
      setDiscount(discountValue);
      setFinalPrice(Math.max(0, initialPrice - discountValue));
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
    if (!validatePlate(buyerInfo.carPlate)) {
      setError("A placa do veículo principal é inválida. Use o formato antigo (AAA-9999) ou Mercosul (AAA9A99).");
      return;
    }
    for (let idx = 0; idx < additionalPassengers.length; idx++) {
      const p = additionalPassengers[idx];
      if (!validatePlate(p.carPlate)) {
        setError(`A placa do veículo do acompanhante ${idx + 2} (${p.fullName || "Acompanhante"}) é inválida. Use o formato antigo (AAA-9999) ou Mercosul (AAA9A99).`);
        return;
      }
    }

    setIsProcessing(true);
    setError("");

    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      
      if (!cart || cart.length === 0) {
        throw new Error("Seu carrinho está vazio. Volte para a página de eventos.");
      }

      const firstItem = cart[0];
      
      // Validação crítica antes de enviar
      if (!firstItem.evento || (!firstItem.evento.id && !firstItem.evento._id)) {
        console.error("[CHECKOUT ERROR] Evento inválido no carrinho:", firstItem.evento);
        throw new Error("Não foi possível identificar o evento selecionado. Tente adicioná-lo ao carrinho novamente.");
      }
      
      if (!firstItem.ticket) {
        console.error("[CHECKOUT ERROR] Ingresso ausente no carrinho:", firstItem);
        throw new Error("Não foi possível identificar o tipo de ingresso selecionado.");
      }

      // Usa auth.currentUser para garantir acesso ao método getIdToken() do SDK Firebase
      let token = "";
      try {
        const currentUser = auth?.currentUser;
        if (currentUser && typeof currentUser.getIdToken === "function") {
          token = await currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("Não foi possível obter o token de autenticação:", tokenErr);
      }

      const payload = {
        evento: firstItem.evento,
        excursion: firstItem.evento, // Para compatibilidade legada
        ticket: { ...firstItem.ticket, price: totalPrice },
        buyerInfo,
        couponCode: couponDetails ? couponDetails.code : undefined,
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
        paymentMethod: "pix",
      };

      console.log("[CHECKOUT DEBUG] Enviando payload:", payload);

      const response = await fetch(`${backendUrl}/api/payment/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao criar a preferência de pagamento.");
      }

      const data = await response.json();
      if (data.paymentMethod === "pix") {
        setPixData({
          id: data.id,
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
        });
      } else {
        setPreferenceId(data.id);
      }
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
              {garageCars.length > 0 && (
                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 my-2">
                  <label className="block text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-2">
                    <Car size={16} /> Selecionar da sua Garagem Virtual
                  </label>
                  <select
                    value={selectedGarageCarId}
                    onChange={(e) => handleSelectGarageCar(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  >
                    <option value="">-- Escolha um veículo --</option>
                    {garageCars.map(car => (
                      <option key={car.id} value={car.id}>
                        {car.make} {car.model} ({car.plate || "Sem placa"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {pixData ? (
            <div className="mt-8 p-6 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></span>
                <h3 className="text-lg font-bold text-zinc-850 dark:text-white">Pagamento Pix Gerado</h3>
              </div>
              
              <div className="bg-white p-3 rounded-xl shadow-md mb-4 border border-zinc-200 dark:border-zinc-800">
                <img
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">
                Abra o app do seu banco, escolha a opção "Pagar com Pix" ou "Pix Copia e Cola" e escaneie ou cole o código abaixo.
              </p>

              <div className="w-full space-y-2 mb-6">
                <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">Código Pix Copia e Cola</label>
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qrCode}
                    className="flex-grow text-xs bg-zinc-200/50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-750 text-zinc-700 dark:text-zinc-300 p-2 rounded-xl focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant={copied ? "success" : "secondary"}
                    className="text-xs whitespace-nowrap px-4 py-2 font-bold"
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.qrCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 font-bold bg-yellow-500/10 dark:bg-yellow-500/10 px-3 py-2 rounded-xl">
                <Spinner size={14} className="border-yellow-600 dark:border-yellow-400" />
                <span>Aguardando detecção de pagamento automático...</span>
              </div>
            </div>
          ) : !preferenceId ? (
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
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                💳 Cartão de crédito/débito, PIX ou boleto — escolha abaixo
              </p>
              <Wallet
                initialization={{ preferenceId, redirectMode: "modal" }}
                customization={{
                  texts: { valueProp: "smart_option" },
                  visual: { buttonBackground: "black", borderRadius: "8px" },
                }}
              />
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
