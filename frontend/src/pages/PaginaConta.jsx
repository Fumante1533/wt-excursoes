import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ShoppingBag, Calendar, Ticket, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import html2canvas from "html2canvas";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
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
import { storage } from "../firebaseConfig";
import PurchaseCardSkeleton from "../components/PurchaseCardSkeleton";
import { Card, Button, PageWrapper, Input, Spinner } from "../components/AppPrimitives";
import { CartaoEvento } from "../components/CartaoEvento";
import CaixaDialogo from "../components/CaixaDialogo";

function PerfilUsuario({ user, db: firestore }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ displayName: "", cpf: "", phone: "", dob: "", photoURL: "" });

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
      <div className="space-y-4"></div>
      <div className="mt-6 text-center p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
        <p className="text-zinc-600 dark:text-zinc-400">
          <Sparkles className="inline-block mr-2" size={18} />
          Em breve você poderá editar seu perfil! Estamos trabalhando nisso.
        </p>
      </div>
      <div>
        <label className="block text-sm font-semibold text-zinc-500">Nome</label>
        <input
          value={form.displayName}
          readOnly={!!profile?.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full mt-1 px-4 py-2 rounded-lg border bg-white dark:bg-zinc-800"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-zinc-500">CPF</label>
        <input
          value={form.cpf}
          readOnly={!!profile?.cpf}
          onChange={(e) => setForm({ ...form, cpf: e.target.value })}
          className="w-full mt-1 px-4 py-2 rounded-lg border bg-white dark:bg-zinc-800"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-zinc-500">Telefone</label>
        <input
          value={form.phone}
          readOnly={!!profile?.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full mt-1 px-4 py-2 rounded-lg border bg-white dark:bg-zinc-800"
        />
      </div>
    </Card>
  );
}

function ModalFormularioCarro({ isOpen, onClose, onSave, car, user }) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setMake(car?.make || "");
    setModel(car?.model || "");
    setYear(car?.year || "");
    setPhotoURL(car?.photoURL || "");
    setFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, [car, isOpen]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let uploadedPhotoURL = car?.photoURL || photoURL;

    if (file) {
      setIsUploading(true);
      const filePath = `users/${user.uid}/cars/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
          (error) => {
            console.error(error);
            reject(error);
          },
          async () => {
            uploadedPhotoURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    }

    onSave({ make, model, year, photoURL: uploadedPhotoURL });
  };

  return (
        <CaixaDialogo isOpen={isOpen} onClose={onClose} title={car ? "Editar Carro" : "Adicionar Carro"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input placeholder="Marca (ex: Volkswagen)" value={make} onChange={(e) => setMake(e.target.value)} required />
        <Input placeholder="Modelo (ex: Golf GTI)" value={model} onChange={(e) => setModel(e.target.value)} required />
        <Input type="number" placeholder="Ano (ex: 2022)" value={year} onChange={(e) => setYear(e.target.value)} required />
        <Input type="file" accept="image/*" onChange={handleFileChange} />
        {isUploading && (
          <div className="w-full bg-zinc-700 rounded-full h-2.5">
            <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        )}
        {!isUploading && (photoURL || file) && (
          <img src={file ? URL.createObjectURL(file) : photoURL} alt="Preview" className="w-full h-40 object-cover rounded-md" />
        )}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? "Enviando..." : "Salvar"}
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
                src={car.photoURL || "https://via.placeholder.com/400x300?text=Sem+Foto"}
                alt={`${car.make} ${car.model}`}
                className="w-full h-40 object-cover rounded-md mb-4"
              />
              <div className="flex-grow">
                <h3 className="font-bold text-lg">
                  {car.make} {car.model}
                </h3>
                <p className="text-zinc-500">{car.year}</p>
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
              src={eventoDetails?.image}
              alt={eventName}
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
                      <QRCodeCanvas value={String(order.ticket.code)} size={120} includeMargin />
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
