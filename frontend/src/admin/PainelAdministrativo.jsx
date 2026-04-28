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
  Menu,
  X,
  Download,
  Mail,
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
import FormularioEvento from "./FormularioEvento";

function TabelaEventoAdmin({ eventos, onEdit, onDelete }) {
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
            {eventos.map((ex) => (
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
  const exportToCSV = () => {
    const headers = ["Nome", "Email", "Evento", "Tipo de Ingresso", "Status", "Preço", "Placa do Carro", "Código Ingresso"];
    const rows = orders.map(order => [
      `"${order.buyerName || ""}"`,
      `"${order.buyerEmail || ""}"`,
      `"${order.eventoName || ""}"`,
      `"${order.ticketType || ""}"`,
      `"${order.status || ""}"`,
      order.price || 0,
      `"${order.carInfo?.plate || ""}"`,
      `"${order.ticket?.code || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lista_presenca_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResendEmail = async (orderId) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      
      const response = await fetch(`${backendUrl}/api/user/resend-ticket`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ orderId })
      });
      
      if (!response.ok) throw new Error("Erro ao reenviar ingresso");
      toast.success("Ingresso reenviado com sucesso!");
    } catch (err) {
      toast.error("Falha ao reenviar o ingresso.");
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Lista de Compradores</h2>
        <button 
          onClick={exportToCSV}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md font-semibold transition-colors flex items-center"
        >
          <Download size={18} className="mr-2" /> Exportar Planilha
        </button>
      </div>
      <div className="bg-zinc-800 rounded-lg shadow-xl overflow-x-auto">
        <table className="w-full text-left text-zinc-300 min-w-[600px]">
          <thead className="bg-zinc-900/50">
            <tr className="border-b border-zinc-700">
              <th className="p-4">Comprador</th>
              <th className="p-4">Evento</th>
              <th className="p-4">Ingresso</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={index} className="border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/50">
                <td className="p-4">
                  <p className="font-semibold text-white">{order.buyerName}</p>
                  <p className="text-sm text-zinc-400">{order.buyerEmail}</p>
                </td>
                <td className="p-4">{order.eventoName}</td>
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
                <td className="p-4">
                  <button
                    title="Reenviar E-mail"
                    onClick={() => handleResendEmail(order.id)}
                    className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 rounded transition-colors"
                  >
                    <Mail size={16} />
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

function ValidadorIngressos({ eventos }) {
  const [ticketCode, setTicketCode] = useState("");
  const [eventoId, setEventoId] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const doValidate = async (codeParam) => {
    const code = String(codeParam !== undefined ? codeParam : ticketCode).trim().toUpperCase();
    if (!code) { toast.error("Informe o código do ingresso."); return; }
    setIsValidating(true);
    setResult(null);
    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
      const user = auth?.currentUser;
      if (!user) { toast.error("Admin não autenticado."); setIsValidating(false); return; }
      const token = await user.getIdToken();
      const response = await fetch(`${backendUrl}/api/payment/validate-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ticketCode: code, ...(eventoId ? { eventoId } : {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Falha ao validar ingresso.");
      setResult(data);
      toast.success("Ingresso validado com sucesso!");
    } catch (err) {
      toast.error(err.message || "Não foi possível validar.");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    if (!isScanning) return;
    setScanError("");
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    (async () => {
      try {
        // facingMode: environment = câmera traseira
        await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          "ticket-video",
          (scanResult) => {
            if (stopped || !scanResult) return;
            const text = String(scanResult.getText() || "").trim().toUpperCase();
            if (text) {
              stopped = true;
              setIsScanning(false);
              setTicketCode(text);
              doValidate(text); // auto-valida imediatamente
            }
          }
        );
      } catch (e) {
        if (!stopped) setScanError("Não foi possível acessar a câmera. Verifique permissões.");
        setIsScanning(false);
      }
    })();
    return () => {
      stopped = true;
      try { reader.reset(); } catch (_) {}
    };
  }, [isScanning]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
      <h2 className="text-3xl font-bold text-white mb-6">Validação de Ingressos</h2>
      <div className="bg-zinc-800 rounded-lg p-6 space-y-4">
        <Button variant="secondary" className="w-full" onClick={() => setIsScanning((v) => !v)}>
          {isScanning ? "⏹ Parar leitura" : "📷 Escanear QR Code"}
        </Button>
        {isScanning && (
          <div className="rounded-lg overflow-hidden border-2 border-yellow-500 bg-black relative">
            <video id="ticket-video" className="w-full h-[300px] object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-4 border-yellow-400 rounded-lg opacity-60" />
            </div>
            <p className="text-center text-yellow-400 text-sm py-2">Aponte para o QR Code do ingresso</p>
          </div>
        )}
        {scanError && <p className="text-red-300 text-sm">{scanError}</p>}
        <div className="text-zinc-400 text-xs text-center">— ou informe o código manualmente —</div>
        <input
          value={ticketCode}
          onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
          placeholder="Código do ingresso (ex: ITC-...)"
          className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600 font-mono"
        />
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          className="w-full bg-zinc-700 text-white p-3 rounded-lg border border-zinc-600"
        >
          <option value="">Validar em qualquer evento</option>
          {eventos.map((ex) => (
            <option key={ex.id} value={String(ex.id)}>{ex.name}</option>
          ))}
        </select>
        <Button onClick={() => doValidate()} disabled={isValidating} className="w-full">
          {isValidating ? "Validando..." : "✅ Validar ingresso"}
        </Button>
        {result && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
            <p className="text-green-400 font-bold text-xl mb-2">✅ Ingresso Válido!</p>
            <p className="text-white font-semibold">{result.buyerName || "—"}</p>
            <p className="text-zinc-300">{result.eventoName || "—"}</p>
            <p className="text-zinc-400 text-xs mt-2 font-mono">{result.ticketCode}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function PainelAdministrativo({
  onNavigate,
  eventos,
  onAddEvento,
  onUpdateEvento,
  onDeleteEvento,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState(null);
  const [orders, setOrders] = useState([]);

  const handleEdit = (evento) => {
    setEditingEvento(evento);
    setActiveTab("addEvento");
  };

  const handleSaveEvento = (eventoData) => {
    if (editingEvento) {
      onUpdateEvento(eventoData);
    } else {
      onAddEvento(eventoData);
    }
    setEditingEvento(null);
    setActiveTab("eventos");
  };

  const openDeleteModal = (evento) => {
    if (!evento || !evento.id) {
      console.warn("openDeleteModal ignorado: objeto sem ID.");
      toast.error("Não foi possível carregar os detalhes do evento para deleção.");
      return;
    }
    setEventoToDelete({ id: evento.id, name: evento.name });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (eventoToDelete && eventoToDelete.id) {
      onDeleteEvento(String(eventoToDelete.id));
    } else {
      console.warn("Tentativa de exclusão ignorada: eventoToDelete.id é nulo ou indefinido.");
      toast.error("Erro: ID do evento não encontrado. Tente recarregar.");
    }
    setShowDeleteModal(false);
    setEventoToDelete(null);
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
                  value: eventos.length,
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
      case "eventos":
        return (
          <TabelaEventoAdmin eventos={eventos} onEdit={handleEdit} onDelete={openDeleteModal} />
        );
      case "addEvento":
        return (
          <FormularioEvento
            onSave={handleSaveEvento}
            initialData={editingEvento}
            onCancel={() => {
              setEditingEvento(null);
              setActiveTab("eventos");
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
        return <ValidadorIngressos eventos={eventos} />;
      default:
        return null;
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "eventos", label: "Eventos", icon: Package },
    { id: "addEvento", label: "Adicionar", icon: Plus },
    { id: "orders", label: "Compradores", icon: Users },
    { id: "ticketValidation", label: "Validar Ingressos", icon: Tag },
    { id: "users", label: "Usuários", icon: UserCircle2 },
    { id: "coupons", label: "Cupons", icon: Tag },
    { id: "blog", label: "Blog", icon: FileText },
  ];

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between mb-8 cursor-pointer" onClick={() => onNavigate("home")}>
        <img src="/assets/logo.png" alt="Logo" className="h-16 w-auto invert brightness-0" />
        <button className="md:hidden text-zinc-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-grow">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setEditingEvento(null); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center p-3 rounded-lg mb-2 transition-colors ${
              activeTab === item.id ? "bg-violet-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <item.icon className="mr-3" size={20} /> {item.label}
          </button>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-zinc-800">
        <Button onClick={() => onNavigate("home")} variant="secondary" className="w-full mb-2">Ver Site</Button>
        <button onClick={onLogout} className="w-full text-left flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
          <LogOut className="mr-3" /> Sair
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar desktop */}
      <aside className="w-64 bg-zinc-950 p-4 flex-col hidden md:flex">
        <SidebarContent />
      </aside>
      {/* Sidebar mobile (drawer) */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-zinc-950 p-4 flex flex-col z-30 transform transition-transform duration-300 md:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>
      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <div className="md:hidden flex items-center gap-3 bg-zinc-950 px-4 py-3 border-b border-zinc-800">
          <button onClick={() => setSidebarOpen(true)} className="text-zinc-300 hover:text-white">
            <Menu size={24} />
          </button>
          <span className="font-bold text-white">Painel Admin</span>
        </div>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-zinc-900">{renderContent()}</main>
      </div>
      <CaixaDialogo isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirmar Exclusão">
        <p className="text-zinc-300 mb-6">
          Você tem certeza que deseja excluir o evento "{eventoToDelete?.name}"? Esta ação não pode ser desfeita.
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
