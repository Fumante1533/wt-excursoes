import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Package,
  Users,
  BarChart2,
  Plus,
  LogOut,
  Edit,
  Trash2,
  UserCircle2,
  Tag,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { BrowserMultiFormatReader } from "@zxing/browser";
import UserManagement from "./UserManagement";
import CouponManagement from "./CouponManagement";
import BlogManagement from "./BlogManagement";
import { Button } from "../components/AppPrimitives";
import CaixaDialogo from "../components/CaixaDialogo";
import FormularioExcursao from "./FormularioExcursao";

function TabelaExcursaoAdmin({ excursions, onEdit, onDelete }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-bold text-white mb-6">Gerenciar Eventos</h2>
      <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left text-zinc-300 min-w-[600px]">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-700">
              <th className="p-4">Evento</th>
              <th className="p-4">Local</th>
              <th className="p-4">Data</th>
              <th className="p-4">Ingressos</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {excursions.map((ex) => (
              <tr key={ex.id} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/50">
                <td className="p-4 font-semibold flex items-center">
                  <img src={ex.image} alt={ex.name} className="w-12 h-12 object-cover rounded-md mr-4" />
                  <span className="text-white">{ex.name}</span>
                </td>
                <td className="p-4">{ex.location}</td>
                <td className="p-4">
                  {new Date(ex.date).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                  {ex.time && <span className="block text-zinc-400 text-sm mt-1">{ex.time} {ex.timeEnd && `às ${ex.timeEnd}`}</span>}
                </td>
                <td className="p-4">{ex.tickets.length}</td>
                <td className="p-4 flex gap-2">
                  <button
                    onClick={() => onEdit(ex)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-zinc-700 rounded-full transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(ex)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ListaPedidosAdmin({ orders }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-3xl font-bold text-white mb-6">Lista de Compradores</h2>
      <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left text-zinc-300 min-w-[600px]">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-700">
              <th className="p-4">Comprador</th>
              <th className="p-4">Evento</th>
              <th className="p-4">Ingresso</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/50">
                <td className="p-4">
                  <p className="font-semibold text-white">{order.buyerName}</p>
                  <p className="text-sm text-zinc-400">{order.buyerEmail}</p>
                </td>
                <td className="p-4">{order.excursionName}</td>
                <td className="p-4">{order.ticketType}</td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === "Pago" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ValidadorIngressos({ excursions }) {
  const [ticketCode, setTicketCode] = useState("");
  const [excursionId, setExcursionId] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(list || []);
        if (list && list.length > 0 && !videoDeviceId) {
          setVideoDeviceId(list[0].deviceId);
        }
      } catch (e) {
        console.debug("Scanner: não foi possível listar câmeras:", e?.message || e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    setScanError("");

    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    (async () => {
      try {
        await reader.decodeFromVideoDevice(videoDeviceId || undefined, "ticket-video", (result) => {
          if (stopped) return;
          if (result) {
            const text = String(result.getText() || "").trim();
            if (text) {
              setTicketCode(text.toUpperCase());
              setIsScanning(false);
            }
          }
        });
      } catch (e) {
        if (!stopped) setScanError("Não foi possível acessar a câmera. Verifique permissões.");
        setIsScanning(false);
        console.debug("Scanner: erro ao iniciar câmera:", e?.message || e);
      }
    })();

    return () => {
      stopped = true;
      try {
        reader.reset();
      } catch (e) {
        console.debug("Scanner: reset falhou:", e?.message || e);
      }
    };
  }, [isScanning, videoDeviceId]);

  const handleValidate = async () => {
    if (!ticketCode.trim()) {
      toast.error("Informe o código do ingresso.");
      return;
    }
    setIsValidating(true);
    setResult(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
      const user = auth?.currentUser;
      if (!user) {
        toast.error("Admin não autenticado.");
        return;
      }
      const token = await user.getIdToken();
      const response = await fetch(`${backendUrl}/api/payment/validate-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketCode,
          ...(excursionId ? { excursionId } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Falha ao validar ingresso.");
      }
      setResult(data);
      toast.success("Ingresso validado com sucesso!");
    } catch (err) {
      toast.error(err.message || "Não foi possível validar.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
      <h2 className="text-3xl font-bold text-white mb-6">Validação de Ingressos</h2>
      <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <Button variant="secondary" onClick={() => setIsScanning((v) => !v)}>
              {isScanning ? "Parar leitura" : "Ler QR Code (câmera)"}
            </Button>
            {devices.length > 1 && (
              <select
                value={videoDeviceId}
                onChange={(e) => setVideoDeviceId(e.target.value)}
                className="flex-1 bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Câmera ${d.deviceId.slice(0, 6)}...`}
                  </option>
                ))}
              </select>
            )}
          </div>
          {isScanning && (
            <div className="rounded-lg overflow-hidden border border-zinc-700 bg-black">
              <video id="ticket-video" className="w-full h-[320px] object-cover" />
            </div>
          )}
          {scanError && <p className="text-red-300 text-sm">{scanError}</p>}
        </div>
        <input
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
          placeholder="Código do ingresso (ex: ITC-...)"
          className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600"
        />
        <select
          value={excursionId}
          onChange={(e) => setExcursionId(e.target.value)}
          className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600"
        >
          <option value="">Validar em qualquer evento</option>
          {excursions.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>
              {ex.name}
            </option>
          ))}
        </select>
        <Button onClick={handleValidate} disabled={isValidating}>
          {isValidating ? "Validando..." : "Validar ingresso"}
        </Button>
        {result && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-green-300 font-semibold">Ingresso válido</p>
            <p className="text-zinc-200">Participante: {result.buyerName || "-"}</p>
            <p className="text-zinc-200">Evento: {result.excursionName || "-"}</p>
            <p className="text-zinc-300 text-sm">Código: {result.ticketCode}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function PainelAdministrativo({
  onNavigate,
  excursions,
  onAddExcursion,
  onUpdateExcursion,
  onDeleteExcursion,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editingExcursion, setEditingExcursion] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [excursionToDelete, setExcursionToDelete] = useState(null);
  const [orders, setOrders] = useState([]);

  const handleEdit = (excursion) => {
    setEditingExcursion(excursion);
    setActiveTab("addExcursion");
  };

  const handleSaveExcursion = (excursionData) => {
    if (editingExcursion) {
      onUpdateExcursion(excursionData);
    } else {
      onAddExcursion(excursionData);
    }
    setEditingExcursion(null);
    setActiveTab("excursions");
  };

  const openDeleteModal = (excursion) => {
    if (!excursion || !excursion.id) {
      console.warn("openDeleteModal ignorado: objeto sem ID.");
      toast.error("Não foi possível carregar os detalhes do evento para deleção.");
      return;
    }
    setExcursionToDelete({ id: excursion.id, name: excursion.name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (excursionToDelete && excursionToDelete.id) {
      onDeleteExcursion(String(excursionToDelete.id));
    } else {
      console.warn("Tentativa de exclusão ignorada: excursionToDelete.id é nulo ou indefinido.");
      toast.error("Erro: ID do evento não encontrado. Tente recarregar.");
    }
    setShowDeleteModal(false);
    setExcursionToDelete(null);
  };

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        if (!db) return;
        const usersCollectionRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollectionRef);
        let allOrders = [];
        for (const userDoc of usersSnapshot.docs) {
          const userId = userDoc.id;
          const ordersCollectionRef = collection(db, "users", userId, "orders");
          const ordersSnapshot = await getDocs(ordersCollectionRef);
          const userOrders = ordersSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            userId,
            ...docSnap.data(),
          }));
          allOrders = allOrders.concat(userOrders);
        }
        setOrders(allOrders);
      } catch (err) {
        console.error("Erro ao buscar pedidos (fetchAllOrders):", err);
      }
    };
    fetchAllOrders();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <h2 className="text-3xl font-bold text-white mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                {
                  icon: DollarSign,
                  label: "Receita Total",
                  value: `R$ ${totalRevenue.toFixed(2)}`,
                },
                {
                  icon: Package,
                  label: "Eventos Ativos",
                  value: excursions.length,
                },
                { icon: Users, label: "Total de Vendas", value: orders.length },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-zinc-800 p-6 rounded-lg flex items-center">
                  <div className="bg-yellow-600/20 p-4 rounded-full mr-4">
                    <kpi.icon className="text-yellow-400" size={28} />
                  </div>
                  <div>
                    <p className="text-zinc-400 text-sm">{kpi.label}</p>
                    <p className="text-2xl font-bold text-white">{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case "excursions":
        return (
          <TabelaExcursaoAdmin excursions={excursions} onEdit={handleEdit} onDelete={openDeleteModal} />
        );
      case "addExcursion":
        return (
          <FormularioExcursao
            onSave={handleSaveExcursion}
            initialData={editingExcursion}
            onCancel={() => {
              setEditingExcursion(null);
              setActiveTab("excursions");
            }}
          />
        );
      case "orders":
        return <ListaPedidosAdmin orders={orders} />;
      case "users":
        return <UserManagement db={db} />;
      case "coupons":
        return <CouponManagement db={db} />;
      case "blog":
        return <BlogManagement db={db} />;
      case "ticketValidation":
        return <ValidadorIngressos excursions={excursions} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex">
      <aside className="w-64 bg-zinc-950 p-4 flex-col hidden md:flex">
        <div className="flex items-center mb-8 cursor-pointer" onClick={() => onNavigate("home")}>
          <img
            src="/assets/itajobicars_logo.png"
            alt="Itajobi Cars Club Logo"
            className="h-20 w-auto invert brightness-0"
          />
        </div>
        <nav className="flex-grow">
          {[
            { id: "dashboard", label: "Dashboard", icon: BarChart2 },
            { id: "excursions", label: "Eventos", icon: Package },
            { id: "addExcursion", label: "Adicionar", icon: Plus },
            { id: "orders", label: "Compradores", icon: Users },
            { id: "ticketValidation", label: "Validar Ingressos", icon: Tag },
            { id: "users", label: "Usuários", icon: UserCircle2 },
            { id: "coupons", label: "Cupons", icon: Tag },
            { id: "blog", label: "Blog", icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setEditingExcursion(null);
              }}
              className={`w-full text-left flex items-center p-3 rounded-lg mb-2 transition-colors ${
                activeTab === item.id ? "bg-violet-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <item.icon className="mr-3" size={20} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-zinc-800">
          <Button onClick={() => onNavigate("home")} variant="secondary" className="w-full mb-2">
            Ver Site
          </Button>
          <button
            onClick={onLogout}
            className="w-full text-left flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="mr-3" /> Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-zinc-900">{renderContent()}</main>
      <CaixaDialogo isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmar Exclusão">
        <p className="text-zinc-300 mb-6">
          Você tem certeza que deseja excluir o evento "{excursionToDelete?.name}"? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-4">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Excluir
          </Button>
        </div>
      </CaixaDialogo>
    </div>
  );
}
