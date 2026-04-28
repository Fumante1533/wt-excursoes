import React, { useState, useEffect } from "react";
import { XCircle } from "lucide-react";
import { signOut, onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { 
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Toaster, toast } from "react-hot-toast";
import { auth, db, firebaseConfigError } from "./firebaseConfig";
import PaginaBlog from "./pages/PaginaBlog";
import PaginaPostBlog from "./pages/PaginaPostBlog";
import PaginaFaq from "./pages/PaginaFaq";
import PaginaResultadoTap from "./pages/PaginaResultadoTap";
import PaginaSobre from "./pages/PaginaSobre";
import PaginaPrivacidade from "./pages/PaginaPrivacidade";
import PaginaTermos from "./pages/PaginaTermos";
import PaginaInicial from "./pages/PaginaInicial";
import { 
  PaginaListaEventos,
  PaginaEventosPassados,
  PaginaCentralEventos,
  PaginaDetalheEvento,
} from "./pages/PaginasEventos";
import PaginaCheckout from "./pages/PaginaCheckout";
import PaginaStatusPagamento from "./pages/PaginaStatusPagamento";
import PaginaAutenticacao from "./pages/PaginaAutenticacao";
import PaginaPerfilPublico from "./pages/PaginaPerfilPublico";
import PaginaConta from "./pages/PaginaConta";
import PaginaLoginAdmin from "./admin/PaginaLoginAdmin";
import PainelAdministrativo from "./admin/PainelAdministrativo";
import { Spinner } from "./components/AppPrimitives";
import AppNavbar from "./components/AppNavbar";
import AppFooter from "./components/AppFooter";
import CarrinhoLateral from "./components/CarrinhoLateral";
import { initialEvents } from "./data/initialEvents";
import { initialBlogPosts } from "./data/initialBlogPosts";
import { initialFaqs } from "./data/initialFaqs";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { loadStripe } from "@stripe/stripe-js";
import { AnimatePresence } from "framer-motion";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;
try {
  if (MP_PUBLIC_KEY) {
    initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
      } else {
    console.warn("VITE_MP_PUBLIC_KEY não definida; Mercado Pago desabilitado.");
  }
    } catch (err) {
  console.warn("Falha ao inicializar Mercado Pago; site não deve travar:", err);
}

export default function App() {
  const [page, setPage] = useState("home");
  const [pageData, setPageData] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminUi, setIsAdminUi] = useState(false);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const [firebaseError, setFirebaseError] = useState(null);
  const [eventos, setEventos] = useState(initialEvents);
  const [darkMode, setDarkMode] = useState(true);
  const [blogPosts, setBlogPosts] = useState(initialBlogPosts);
  const [faqs, setFaqs] = useState(initialFaqs);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      setFirebaseInitialized(true);

      const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
      if (stripePublicKey) {
        loadStripe(stripePublicKey);
      }
    } catch (error) {
      console.error("Falha ao inicializar Firebase:", error);
      setFirebaseError("Não foi possível conectar aos serviços.");
    }
    const onError = (ev) => {
      console.error("Global error captured:", ev.error || ev.message || ev, ev);
    };
    const onUnhandledRejection = (ev) => {
      console.error("Unhandled promise rejection:", ev.reason || ev);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    if (!firebaseConfigError) return;
    console.error("Erro na configuração Firebase:", firebaseConfigError);
    setFirebaseError(firebaseConfigError.message || "Falha ao inicializar Firebase.");
    // Evita ficar preso no spinner quando `auth/db` estão inválidos.
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (firebaseInitialized && auth) {
          const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.debug("onAuthStateChanged -> user:", currentUser);
            setUser(currentUser);
              (async () => {
                setAuthReady(false);
                try {
                  if (currentUser) {
                    try {
                      await currentUser.getIdToken(true);
                    } catch (err) {
                console.warn("Falha ao forçar refresh do ID token:", err);
                    }
                    try {
                      const idResult = await getIdTokenResult(currentUser);
                      const isAdminClaim = !!(idResult && idResult.claims && idResult.claims.admin);
                      const currentEmail = currentUser && currentUser.email ? currentUser.email.trim().toLowerCase() : "";
                      const normalizedAdmin = (ADMIN_EMAIL || "itacars237@admin.com").trim().toLowerCase();
                      const secondaryAdmin = "aryelgamerbrs2@gmail.com";
                      const emailAdmin = !!(normalizedAdmin && currentEmail === normalizedAdmin) || currentEmail === secondaryAdmin;
                      setIsAdmin(isAdminClaim);
                      setIsAdminUi(isAdminClaim || emailAdmin);
                    } catch (err) {
                console.warn("getIdTokenResult falhou, usando verificação por email como fallback:", err);
                const currentEmail = currentUser && currentUser.email ? currentUser.email.trim().toLowerCase() : "";
                const normalizedAdmin = (ADMIN_EMAIL || "").trim().toLowerCase();
                setIsAdmin(false);
                setIsAdminUi(!!(normalizedAdmin && currentEmail === normalizedAdmin));
              }

                    try {
                      if (db) {
                        const userDocRef = doc(db, "users", currentUser.uid);
                        const snap = await getDoc(userDocRef);
                        if (!snap.exists()) {
                          await setDoc(userDocRef, {
                            displayName: currentUser.displayName || "",
                            email: currentUser.email || "",
                            photoURL: currentUser.photoURL || "",
                            createdAt: serverTimestamp(),
                          });
                          console.info("Documento de usuário criado automaticamente:", currentUser.uid);
                        }
                      }
                      
                      // Chama a API de vinculação de convidados
                      const token = await currentUser.getIdToken();
                      const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
                      await fetch(`${backendUrl}/api/user/link-guest-orders`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${token}` }
                      });
                    } catch (err) {
                      console.warn("Erro ao lidar com dados de usuário:", err);
                    }
                  } else {
                    setIsAdmin(false);
                    setIsAdminUi(false);
                  }
                } finally {
                  setAuthReady(true);
                }
              })();
          });
          return () => unsubscribe();
        }
    }, [firebaseInitialized]);

  useEffect(() => {
    (async () => {
      try {
        if (!firebaseInitialized || !auth) return;
        const currentPath = window.location.pathname || "";
        if (!currentPath.includes("/admin")) return;
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return;
        }
        setAuthReady(false);
        try {
          await currentUser.getIdToken(true);
          const idResult = await getIdTokenResult(currentUser);
          const isAdminClaim = !!(idResult && idResult.claims && idResult.claims.admin);
          const currentEmail = currentUser && currentUser.email ? currentUser.email.trim().toLowerCase() : "";
          const normalizedAdmin = (ADMIN_EMAIL || "itacars237@admin.com").trim().toLowerCase();
          const secondaryAdmin = "aryelgamerbrs2@gmail.com";
          const emailAdmin = !!(normalizedAdmin && currentEmail === normalizedAdmin) || currentEmail === secondaryAdmin;
          setIsAdmin(isAdminClaim);
          setIsAdminUi(isAdminClaim || emailAdmin);
          if (isAdminClaim || emailAdmin) {
            setPage("adminDashboard");
          } else {
            setPage("adminLogin");
          }
        } catch (err) {
          console.warn("Falha ao revalidar token/claims no carregamento da página admin:", err);
        } finally {
          setAuthReady(true);
        }
      } catch (err) {
        console.error("Erro inesperado ao tentar revalidar admin na inicialização:", err);
      }
    })();
  }, [firebaseInitialized, auth]);

  useEffect(() => {
    try {
      const currentPath = window.location.pathname || "/";
      if (currentPath === "/" || currentPath === "") {
        setPage("home");
        return;
      }
      if (currentPath.startsWith("/eventos/")) {
        const parts = currentPath.split("/").filter(Boolean);
        const id = parts[1];
        setPageData({ eventId: isNaN(Number(id)) ? id : Number(id) });
        setPage("eventDetail");
        return;
      }
      if (currentPath.startsWith("/success")) {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get("session_id");
        if (sessionId) {
          setPageData({ status: "success", sessionId });
        } else {
          setPageData({ status: "success" });
        }
        setPage("success");
        return;
      }
      if (currentPath.startsWith("/error")) {
        setPageData({ status: "error" });
        setPage("error");
        return;
      }

      if (currentPath === "/eventos") {
        setPage("eventos");
        return;
      }
      if (currentPath.startsWith("/blog/")) {
        const parts = currentPath.split("/").filter(Boolean);
        const slug = parts[1];
        setPageData({ slug });
        setPage("blogPost");
        return;
      }
      if (currentPath === "/blog") {
        setPage("blog");
        return;
      }
      if (currentPath === "/faq") {
        setPage("faq");
        return;
      }
      if (currentPath === "/account" || currentPath === "/perfil") {
        setPage("account");
        return;
      }
    } catch (err) {
      console.warn("Erro ao determinar rota inicial:", err);
    }
  }, []);

    useEffect(() => {
        if (!firebaseInitialized || !db) return;

    const eventosRef = collection(db, "eventos");
    const blogRef = collection(db, "blogPosts");
    const faqsRef = collection(db, "faqs");

    const unsubscribeEventos = onSnapshot(query(eventosRef, orderBy("date", "desc")), (snapshot) => {
      // Sincroniza com o Firestore. Se estiver vazio, o estado refletirá isso.
      const eventosData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEventos(eventosData.length > 0 ? eventosData : initialEvents);
    });

    const unsubscribeBlog = onSnapshot(query(blogRef, orderBy("createdAt", "desc")), (snapshot) => {
      // Se o Firestore estiver vazio, mantemos os exemplos locais.
      if (snapshot.empty) return;
      setBlogPosts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubscribeFaqs = onSnapshot(faqsRef, (snapshot) => {
      // Se o Firestore estiver vazio, mantemos os exemplos locais.
      if (snapshot.empty) return;
      setFaqs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

        return () => {
          unsubscribeEventos();
          unsubscribeBlog();
          unsubscribeFaqs();
        };
    }, [firebaseInitialized]);


  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") !== "false";
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  }, [darkMode]);

  const handleNavigate = async (newPage, data = {}) => {
    if ((newPage === "adminLogin" || newPage === "adminDashboard") && auth) {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.getIdToken(true);
          try {
            const idResult = await getIdTokenResult(currentUser);
            const isAdminClaim = !!(idResult && idResult.claims && idResult.claims.admin);
            const currentEmail = (currentUser.email || "").trim().toLowerCase();
            const normalizedAdmin = (ADMIN_EMAIL || "itacars237@admin.com").trim().toLowerCase();
            const secondaryAdmin = "aryelgamerbrs2@gmail.com";
            const emailAdmin = !!(normalizedAdmin && currentEmail === normalizedAdmin) || currentEmail === secondaryAdmin;
            setIsAdmin(isAdminClaim);
            setIsAdminUi(isAdminClaim || emailAdmin);
          } catch (err) {
            console.warn("Falha ao ler claims após refresh:", err);
          }
        }
      } catch (err) {
        console.warn("Não foi possível forçar refresh do token antes de navegar para admin:", err);
      }
    }

    let path = "/";
    if (newPage === "adminLogin" || newPage === "adminDashboard") {
      path = "/admin";
    } else if (newPage === "eventDetail") {
      path = `/eventos/${data.eventId}`;
    } else if (newPage !== "home") {
      path = `/${newPage}`;
    }

    if ((newPage === "adminLogin" || newPage === "adminDashboard") && !authReady) {
      setPageData(data);
      setPage(newPage);
      return;
    }

    window.history.pushState({}, "", path);
    window.scrollTo(0, 0);
    setPageData(data);
    setPage(newPage);
  };

  const handleAddToCart = (evento, ticket) => {
    setCart((prevCart) => {
        const cartItemId = `${evento.id}-${ticket.type}`;
      const existingItem = prevCart.find((item) => item.id === cartItemId);

        if (existingItem) {
        return prevCart.map((item) =>
                item.id === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
            );
        }
      return [...prevCart, { id: cartItemId, evento, ticket, quantity: 1 }];
    });
    toast.success(`${ticket.type} para ${evento.name} adicionado ao carrinho!`);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (cartItemId, newQuantity) => {
      if (newQuantity < 1) {
          handleRemoveFromCart(cartItemId);
      } else {
      setCart((prevCart) =>
        prevCart.map((item) => (item.id === cartItemId ? { ...item, quantity: newQuantity } : item))
      );
      }
  };

  const handleRemoveFromCart = (cartItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== cartItemId));
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    handleNavigate("home");
  };

  const handleAdminLogin = () => {
    handleNavigate("adminDashboard");
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    setUser(null);
    setIsAdmin(false);
    setIsAdminUi(false);
    handleNavigate("home");
  };

const addEvento = async (newEventoData) => {
    if (!db) {
        toast.error("Serviço indisponível.");
        return null;
    }
    if (!isAdminUi) {
        toast.error("Sem permissão de admin.");
        return null;
    }

    try {
      const eventosCollectionRef = collection(db, "eventos");
        const docRef = await addDoc(eventosCollectionRef, newEventoData);
        const finalEvento = { 
            id: docRef.id, 
        ...newEventoData,
        };

        await setDoc(docRef, { id: docRef.id }, { merge: true });

        toast.success(`Evento "${newEventoData.name}" criado com sucesso! ID: ${docRef.id}`);

        return finalEvento; 
    } catch (error) {
        console.error("Erro ao adicionar evento:", error);
        toast.error("Falha ao criar o evento.");
        return null;
    }
};

const updateEvento = async (updatedEventoData) => {
    if (!isAdminUi) {
        toast.error("Sem permissão de admin.");
        return;
    }
    const { id, ...data } = updatedEventoData;
    const eventoDocRef = doc(db, "eventos", String(id));
    await setDoc(eventoDocRef, data, { merge: true });
};

const deleteEvento = async (id) => {
    if (!isAdminUi) {
        toast.error("Sem permissão de admin.");
        return;
    }

    const stringId = String(id);
    
    if (!stringId || stringId === "null" || stringId === "undefined") {
        console.error("Tentativa de exclusão com ID inválido ou nulo:", id);
        toast.error("ID do evento inválido para exclusão.");
        return;
    }
    
    try {
      const eventoDocRef = doc(db, "eventos", stringId);
        await deleteDoc(eventoDocRef);
        toast.success("Evento excluído!");
    } catch (error) {
        console.error("Erro ao excluir evento:", error);
        toast.error("Erro ao excluir evento. Verifique as permissões.");
    }
};

  const navProps = (p, params) => handleNavigate(p, params);
  navProps.onAddToCart = handleAddToCart;
  navProps.initialTab = pageData.initialTab;
  navProps.handleCartToggle = () => setIsCartOpen(!isCartOpen);
  navProps.cartCount = cart.length;

  const renderPage = () => {
    if (!authReady) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-950">
          <Spinner />
        </div>
      );
    }

    if (firebaseError) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-950 text-center p-4">
          <div>
            <XCircle className="mx-auto text-red-500 mb-4" size={60} />
            <h1 className="text-2xl font-bold">Ocorreu um Erro</h1>
            <p className="text-zinc-500 dark:text-zinc-400">{firebaseError}</p>
          </div>
        </div>
      );
    }

    const currentPath = window.location.pathname;
    if (currentPath.includes("/admin") && !authReady) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-950">
          <Spinner />
        </div>
      );
    }

    if ((currentPath.includes("/admin") || page.startsWith("admin")) && !isAdminUi) {
      return <PaginaLoginAdmin onLogin={handleAdminLogin} />;
    }

    switch (page) {
      case "home":
        return <PaginaInicial onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />;
      case "eventos":
        return (
          <PaginaListaEventos onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />
        );
      case "events":
        return (
          <PaginaListaEventos onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />
        );
      case "eventsHub":
        return (
          <PaginaCentralEventos onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />
        );
      case "pastEvents":
        return (
          <PaginaEventosPassados onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />
        );
      case "eventDetail": {
        const evento = eventos.find((e) => String(e.id) === String(pageData.eventId));
          return evento ? (
          <PaginaDetalheEvento onNavigate={navProps} evento={evento} user={user} db={db} />
        ) : (
          <PaginaListaEventos onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />
        );
      }
      case "checkout": {
        const cartItems = pageData.cart || [];
        return cartItems.length > 0 ? (
          <PaginaCheckout cart={cartItems} user={user} />
        ) : (
          <PaginaListaEventos onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />
        );
      }
      case "success":
        return (
          <PaginaStatusPagamento
            onNavigate={handleNavigate}
            status="success"
            orderDetails={pageData.orderDetails}
            sessionId={pageData.sessionId}
          />
        );
      case "error":
          return (
          <PaginaStatusPagamento onNavigate={handleNavigate} status="error" orderDetails={pageData.orderDetails} />
          );
      case "auth":
        return <PaginaAutenticacao onLoginSuccess={handleLoginSuccess} />;
      case "account":
        if (!user) {
          return <PaginaAutenticacao onLoginSuccess={handleLoginSuccess} />;
        }
        return (
          <PaginaConta
            user={user}
            eventos={eventos}
            onNavigate={handleNavigate}
            db={db}
            initialTab={pageData.initialTab}
          />
        );
      case "profile":
        return <PaginaPerfilPublico userId={pageData.userId} onNavigate={handleNavigate} />;
      case "tapResult":
        return <PaginaResultadoTap onNavigate={handleNavigate} />;
      case "terms":
        return <PaginaTermos />;
      case "privacy":
        return <PaginaPrivacidade />;
      case "about":
        return <PaginaSobre />;
      case "adminLogin":
        return <PaginaLoginAdmin onLogin={handleAdminLogin} />;
      case "adminDashboard":
        return (
          <PainelAdministrativo
            onNavigate={handleNavigate}
            eventos={eventos}
            onAddEvento={addEvento}
            onUpdateEvento={updateEvento}
            onDeleteEvento={deleteEvento}
            onLogout={handleLogout}
          />
        );
      case "blog":
        return <PaginaBlog onNavigate={handleNavigate} posts={blogPosts} />;
      case "blogPost": {
        const post = blogPosts.find(
          (p) =>
            (pageData.postId && String(p.id) === String(pageData.postId)) ||
            (pageData.slug &&
              (String(p.id) === String(pageData.slug) || (p.slug && p.slug === pageData.slug)))
        );
        return post ? (
          <PaginaPostBlog onNavigate={handleNavigate} post={post} user={user} db={db} />
        ) : (
          <PaginaBlog onNavigate={handleNavigate} posts={blogPosts} />
        );
      }
      case "faq":
        return <PaginaFaq faqs={faqs} />;
      default:
        return <PaginaInicial onNavigate={handleNavigate} eventos={eventos} user={user} db={db} />;
    }
  };
  
  const isFullPageLayout = !page.startsWith("admin");

  return (
    <div className="font-sans bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 transition-colors duration-300">
      <Toaster
                position="bottom-right"
                toastOptions={{ 
          className: "",
                    style: {
            border: "1px solid #7132a0",
            padding: "16px",
            color: "#FFF",
            backgroundColor: "#18181b",
                    },
                }}
            />
      {isFullPageLayout && (
        <AppNavbar
          onNavigate={handleNavigate}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
          user={user}
          onLogout={handleLogout}
          isAdmin={isAdminUi}
        />
      )}
      <CarrinhoLateral
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemove={handleRemoveFromCart}
          onNavigate={handleNavigate}
      />
      <AnimatePresence mode="wait">
        <main key={page}>{renderPage()}</main>
      </AnimatePresence>
      {isFullPageLayout && <AppFooter onNavigate={handleNavigate} db={db} />}
    </div>
  );
}
