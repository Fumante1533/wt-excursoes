import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag, Calendar, Ticket, Download, Mail, Bell, BellOff } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { auth, app } from "../firebaseConfig";
import PurchaseCardSkeleton from "../components/PurchaseCardSkeleton";
import { Card, Button, PageWrapper, Input, Spinner } from "../components/AppPrimitives";
import { CartaoEvento } from "../components/CartaoEvento";
import CaixaDialogo from "../components/CaixaDialogo";
import { ImageUploader } from "../components/ImageUploader";
import { getTicketQrValue } from "../utils/ticket";
import { withUploadCacheBust } from "../utils/imageUrl";

function PerfilUsuario({ user, db: firestore }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ displayName: "", cpf: "", phone: "", dob: "", photoURL: "" });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    let unsub;
    (async () => {
      try {
        if (!user || !firestore) return setLoading(false);
        const userDocRef = doc(firestore, "users", user.uid);
        unsub = onSnapshot(
          userDocRef,
          (snap) => {
            const data = snap.exists() ? snap.data() : {};
            setProfile(data);
            setForm({
              displayName: data.displayName || user.displayName || "",
              cpf: data.cpf || "",
              phone: data.phone || data.telefone || "",
              dob: data.dob || "",
              photoURL: data.photoURL || user.photoURL || "",
            });
            setNotificationsEnabled(!!data.notificationsEnabled);
            setLoading(false);
          },
          (err) => {
            console.error("Erro ao ler perfil do Firestore:", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Erro ao inicializar leitura do perfil:", err);
        setLoading(false);
      }
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [user, firestore]);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      toast.error("Este navegador não suporta notificações.");
      return;
    }
    
    if (Notification.permission === "denied") {
      toast.error("Notificações bloqueadas no navegador. Ative nas configurações do site.");
      return;
    }

    try {
      if (notificationsEnabled) {
        const userDocRef = doc(firestore, "users", user.uid);
        await updateDoc(userDocRef, {
          notificationsEnabled: false,
          fcmToken: ""
        });
        setNotificationsEnabled(false);
        toast.success("Notificações desativadas.");
      } else {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          if (app) {
            const { getMessaging, getToken } = await import("firebase/messaging");
            const messaging = getMessaging(app);
            const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
            if (token) {
              const userDocRef = doc(firestore, "users", user.uid);
              await updateDoc(userDocRef, {
                fcmToken: token,
                notificationsEnabled: true
              });
              setNotificationsEnabled(true);
              toast.success("Notificações ativadas com sucesso!");
            } else {
              toast.error("Não foi possível gerar o token de notificações.");
            }
          } else {
            toast.error("Serviço de notificações não configurado.");
          }
        } else {
          toast.error("Permissão de notificações negada.");
        }
      }
    } catch (err) {
      console.error("Erro ao configurar notificações:", err);
      toast.error("Não foi possível alternar as notificações.");
    }
  };

  if (loading) {
    return (
      <Card className="p-8 max-w-lg">
        <Spinner />
      </Card>
    );
  }

  return (
    <Card className="p-8 max-w-lg">
      <div className="flex items-center gap-6 mb-6">
        <div>
          {(() => {
            const name = form.displayName || user?.displayName || "U";
            const parts = name.split(" ").filter(Boolean);
            const initials =
              parts.length === 1 ? parts[0].charAt(0) : parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
            return (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center font-bold text-3xl">
                {initials.toUpperCase()}
              </div>
            );
          })()}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">
            {form.displayName || user?.displayName || "Usuário"}
          </h2>
          <p className="text-sm text-zinc-500">{user?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-500">Nome</label>
          <input
            value={form.displayName}
            readOnly={!!profile?.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="w-full mt-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-500">CPF</label>
          <input
            value={form.cpf}
            readOnly={!!profile?.cpf}
            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            className="w-full mt-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-zinc-500">Telefone</label>
          <input
            value={form.phone}
            readOnly={!!profile?.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full mt-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-6 text-center p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
          <Sparkles className="inline-block mr-2" size={18} />
          Em breve você poderá editar seu perfil! Estamos trabalhando nisso.
        </p>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg transition-colors ${notificationsEnabled ? "bg-yellow-500/10 text-yellow-500" : "bg-zinc-500/10 text-zinc-500"}`}>
              {notificationsEnabled ? <Bell size={20} className="animate-pulse" /> : <BellOff size={20} />}
            </div>
            <div>
              <h4 className="font-semibold text-zinc-800 dark:text-white text-sm">Notificações Push</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Receba alertas de novos lotes e encontros</p>
            </div>
          </div>
          <button
            onClick={toggleNotifications}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              notificationsEnabled ? "bg-yellow-500" : "bg-zinc-300 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                notificationsEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </Card>
  );
}

function ModalFormularioCarro({ isOpen, onClose, onSave, car, user }) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    setMake(car?.make || "");
    setModel(car?.model || "");
    setYear(car?.year || "");
    setPlate(car?.plate || "");
    setColor(car?.color || "");
    setPhotoURL(car?.photoURL || "");
  }, [car, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave({ make, model, year, plate, color, photoURL });
  };

  return (
    <CaixaDialogo isOpen={isOpen} onClose={onClose} title={car ? "Editar Carro" : "Adicionar Carro"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Marca (ex: Volkswagen)" value={make} onChange={(e) => setMake(e.target.value)} required />
        <Input placeholder="Modelo (ex: Golf GTI)" value={model} onChange={(e) => setModel(e.target.value)} required />
        <Input type="number" placeholder="Ano (ex: 2022)" value={year} onChange={(e) => setYear(e.target.value)} required />
        <Input placeholder="Placa (ex: ABC1D23)" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} maxLength="7" required />
        <Input placeholder="Cor (ex: Vermelho)" value={color} onChange={(e) => setColor(e.target.value)} required />
        <div className="mt-2 mb-2">
          <label className="block text-sm font-semibold text-zinc-500 mb-2">Foto do Veículo</label>
          <ImageUploader
            value={photoURL}
            onChange={setPhotoURL}
            placeholder="URL da imagem ou faça upload"
            uploadPath={`users/${user.uid}/cars`}
          />
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Salvar
          </Button>
        </div>
      </form>
    </CaixaDialogo>
  );
}

function GerenciamentoCarrosUsuario({ user, db: firestore }) {
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);

  useEffect(() => {
    if (!user || !firestore) return;
    const carsColRef = collection(firestore, "users", user.uid, "cars");
    const unsubscribe = onSnapshot(carsColRef, (snapshot) => {
      setCars(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, firestore]);

  const handleOpenModal = (car = null) => {
    setEditingCar(car);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCar(null);
  };

  const handleSaveCar = async (carData) => {
    const carsColRef = collection(firestore, "users", user.uid, "cars");
    if (editingCar) {
      const carDocRef = doc(firestore, "users", user.uid, "cars", editingCar.id);
      await updateDoc(carDocRef, carData);
      toast.success("Carro atualizado com sucesso!");
    } else {
      await addDoc(carsColRef, carData);
      toast.success("Carro adicionado com sucesso!");
    }
    handleCloseModal();
  };

  const handleDeleteCar = async (carId) => {
    if (window.confirm("Tem certeza que deseja remover este carro?")) {
      const carDocRef = doc(firestore, "users", user.uid, "cars", carId);
      await deleteDoc(carDocRef);
      toast.success("Carro removido.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Meus Carros</h2>
        <Button onClick={() => handleOpenModal()}>Adicionar Carro</Button>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {cars.map((car) => (
            <Card key={car.id} className="p-4 flex flex-col">
              <img
                src={withUploadCacheBust(car.photoURL) || "https://via.placeholder.com/400x300?text=Sem+Foto"}
                alt={`${car.make} ${car.model}`}
                loading="lazy"
                decoding="async"
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <div className="flex-grow">
                <h3 className="font-bold text-lg text-zinc-800 dark:text-white">
                  {car.make} {car.model}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {car.year}
                  </span>
                  {car.plate && (
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                      {car.plate}
                    </span>
                  )}
                  {car.color && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      {car.color}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => handleOpenModal(car)} variant="secondary" className="flex-1 py-2">
                  Editar
                </Button>
                <Button onClick={() => handleDeleteCar(car.id)} variant="danger" className="flex-1 py-2">
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {cars.length === 0 && !isLoading && <p>Você ainda não adicionou nenhum carro.</p>}
            <ModalFormularioCarro isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveCar} car={editingCar} user={user} />
    </div>
  );
}

function ComprasUsuario({ user, eventos, onNavigate, db: firestore }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !firestore) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const ordersCollectionRef = collection(firestore, "users", user.uid, "orders");
        const data = await getDocs(ordersCollectionRef);
        const fetchedOrders = data.docs.map((d) => ({ id: d.id, ...d.data() }));
        fetchedOrders.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Erro ao buscar compras do usuário:", err);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PurchaseCardSkeleton />
        <PurchaseCardSkeleton />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="mx-auto text-zinc-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">Nenhuma inscrição encontrada</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-6">Parece que você ainda não participou de nenhum evento conosco.</p>
        <Button onClick={() => onNavigate("events")}>Ver Eventos</Button>
      </div>
    );
  }

  const downloadTicket = async (orderId) => {
    const element = document.getElementById(`ticket-${orderId}`);
    if (!element) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#18181b" });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ingresso-${orderId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao gerar PDF/Imagem:", err);
      toast.error("Não foi possível gerar o ingresso.");
    }
  };

  const handleResendMyTicket = async (orderId) => {
    try {
      const token = await auth?.currentUser?.getIdToken();
      if (!token) { toast.error("Você precisa estar logado."); return; }
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      const response = await fetch(`${backendUrl}/api/user/resend-my-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId }),
      });
      if (!response.ok) throw new Error();
      toast.success("Ingresso reenviado para o seu e-mail!");
    } catch {
      toast.error("Não foi possível reenviar o ingresso.");
    }
  };

  return (
    <div className="space-y-6">
      {orders.map((order) => {
        const firstItem = Array.isArray(order.items) ? order.items[0] : null;
        const eventId = order.eventoId || firstItem?.eventoId;
        const eventName = order.eventoName || firstItem?.eventoName || "Evento";
        const eventoDetails = eventos.find((ex) => String(ex.id) === String(eventId));
        const eventDate = order.eventoDate || firstItem?.eventoDate || eventoDetails?.date;
        const ticketType = order.ticketType || firstItem?.ticketType || "-";
        const amount = order.price ?? order.totalPrice ?? 0;
        const carInfo = order.carInfo || {};
        return (
          <Card key={order.id} id={`ticket-${order.id}`} className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6 relative">
            <img
              src={withUploadCacheBust(eventoDetails?.image)}
              alt={eventName}
              loading="lazy"
              decoding="async"
              className="w-full md:w-48 h-48 md:h-32 object-cover rounded-lg"
            />
            <div className="flex-grow">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Comprado em {new Date(order.purchaseDate).toLocaleDateString("pt-BR")}
              </p>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-white">{eventName}</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                <Calendar size={14} className="inline mr-2" /> Data do Evento:{" "}
                {eventDate ? new Date(eventDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
              </p>
              <p className="text-zinc-600 dark:text-zinc-300">
                <Ticket size={14} className="inline mr-2" /> Inscrição: {ticketType}
              </p>
              {order.ticket?.code && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <p className="text-zinc-700 dark:text-zinc-200">
                    Ingresso: <span className="font-mono">{order.ticket.code}</span>{" "}
                    {order.ticket.validated ? (
                      <span className="text-green-500">(validado)</span>
                    ) : (
                      <span className="text-yellow-500">(pendente)</span>
                    )}
                  </p>
                  <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="bg-white p-2 rounded-md">
                      <QRCodeCanvas value={getTicketQrValue(order.ticket)} size={120} includeMargin />
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      <p>Mostre este QR Code na entrada do evento.</p>
                      <p className="mt-1">Se pedirem, informe também a placa do carro.</p>
                    </div>
                  </div>
                </div>
              )}
              {carInfo.plate && (
                <p className="text-zinc-600 dark:text-zinc-300 text-sm">
                  Carro: {carInfo.model || "-"} • {carInfo.plate} • {carInfo.year || "-"} • {carInfo.color || "-"}
                </p>
              )}
            </div>
            <div className="text-left md:text-right w-full md:w-auto mt-4 md:mt-0">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Valor Pago</p>
              <p className="text-2xl font-bold text-yellow-400">
                R$ {amount?.toFixed ? amount.toFixed(2) : amount}
              </p>
              {order.ticket?.code && (
                <Button 
                  className="mt-4 w-full md:w-auto" 
                  onClick={() => downloadTicket(order.id)}
                  variant="outline"
                  size="sm"
                >
                  <Download size={16} className="mr-2 inline" /> Baixar Ingresso
                </Button>
              )}
              {order.ticket?.qrPayload?.startsWith("http") && (
                <Button
                  className="mt-2 w-full md:w-auto"
                  onClick={() => window.open(order.ticket.qrPayload, "_blank", "noopener,noreferrer")}
                  variant="secondary"
                  size="sm"
                >
                  Abrir QR seguro
                </Button>
              )}
              {order.ticket?.code && (
                <Button
                  className="mt-2 w-full md:w-auto"
                  onClick={() => handleResendMyTicket(order.id)}
                  variant="secondary"
                  size="sm"
                >
                  <Mail size={16} className="mr-2 inline" /> Reenviar por E-mail
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function PaginaConta({ user, eventos, onNavigate, db: firestore, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || onNavigate?.initialTab || "purchases");
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (user && firestore && activeTab === "wishlist") {
      const wishlistRef = collection(firestore, "users", user.uid, "wishlist");
      const unsubscribe = onSnapshot(wishlistRef, (snapshot) => {
        const wishlistIds = snapshot.docs.map((d) => d.id);
        const wishlistEventos = eventos.filter((ex) => wishlistIds.includes(String(ex.id)));
        setWishlist(wishlistEventos);
      });
      return () => unsubscribe();
    }
  }, [user, firestore, activeTab, eventos]);

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center font-bold text-5xl flex-shrink-0">
              {user.displayName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-800 dark:text-white">Minha Conta</h1>
              <p className="text-lg text-zinc-500 dark:text-zinc-400">{user.email}</p>
            </div>
          </div>

          <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-3 font-semibold transition-colors ${
                activeTab === "profile"
                  ? "border-b-2 border-yellow-500 text-yellow-500"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              }`}
            >
              Perfil
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`px-4 py-3 font-semibold transition-colors ${
                activeTab === "purchases"
                  ? "border-b-2 border-yellow-500 text-yellow-500"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              }`}
            >
              Minhas Inscrições
            </button>
            <button
              onClick={() => setActiveTab("myCars")}
              className={`px-4 py-3 font-semibold transition-colors ${
                activeTab === "myCars"
                  ? "border-b-2 border-yellow-500 text-yellow-500"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              }`}
            >
              Meus Carros
            </button>
            <button
              onClick={() => setActiveTab("wishlist")}
              className={`px-4 py-3 font-semibold transition-colors ${
                activeTab === "wishlist"
                  ? "border-b-2 border-yellow-500 text-yellow-500"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              }`}
            >
              Lista de Desejos
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {activeTab === "profile" && <PerfilUsuario user={user} db={firestore} />}
              {activeTab === "purchases" && (
                <ComprasUsuario user={user} eventos={eventos} onNavigate={onNavigate} db={firestore} />
              )}
              {activeTab === "myCars" && <GerenciamentoCarrosUsuario user={user} db={firestore} />}
              {activeTab === "wishlist" && (
                <div>
                  <h2 className="text-2xl font-bold text-zinc-800 dark:text-white mb-6">Minha Lista de Desejos</h2>
                  {wishlist.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {wishlist.map((ex) => (
                        <CartaoEvento key={ex.id} event={ex} onNavigate={onNavigate} user={user} db={firestore} />
                      ))}
                    </div>
                  ) : (
                    <p>Você ainda não adicionou nenhum evento à sua lista de desejos.</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
