import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { XCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut, onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { 
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Toaster, toast } from "react-hot-toast";
import { logActivity } from "./utils/ActivityLogger";
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
import PaginaRanking from "./pages/PaginaRanking";
import PaginaParceiros from "./pages/PaginaParceiros";
import PaginaIngresso from "./pages/PaginaIngresso";
import PaginaLoginAdmin from "./admin/PaginaLoginAdmin";
const PainelAdministrativo = React.lazy(() => import("./admin/PainelAdministrativo"));
import { Spinner } from "./components/AppPrimitives";
import AppNavbar from "./components/AppNavbar";
import AppFooter from "./components/AppFooter";
import CarrinhoLateral from "./components/CarrinhoLateral";
import { initialEvents } from "./data/initialEvents";
import { initialBlogPosts } from "./data/initialBlogPosts";
import { initialFaqs } from "./data/initialFaqs";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { loadStripe } from "@stripe/stripe-js";

// Credenciais de admin — lidas do .env, NUNCA hardcoded aqui
const ADMIN_EMAIL    = (import.meta.env.VITE_ADMIN_EMAIL   || "").trim().toLowerCase();
const ADMIN_EMAIL_2  = (import.meta.env.VITE_ADMIN_EMAIL_2 || "").trim().toLowerCase();
const ADMIN_UID      = (import.meta.env.VITE_ADMIN_UID     || "").trim();

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

function routeToPage(location) {
  const currentPath = (location.pathname || "/").replace(/\/$/, "") || "/";
  const urlParams = new URLSearchParams(location.search || "");

  if (currentPath === "/") return { page: "home", data: {} };
  if (currentPath === "/admin") return { page: "adminDashboard", data: {} };
  if (currentPath.startsWith("/eventos/")) {
    const id = decodeURIComponent(currentPath.split("/").filter(Boolean)[1] || "");
    return { page: "eventDetail", data: { eventId: isNaN(Number(id)) ? id : Number(id) } };
  }
  if (currentPath.startsWith("/blog/")) {
    const slug = decodeURIComponent(currentPath.split("/").filter(Boolean)[1] || "");
    return { page: "blogPost", data: { slug } };
  }
  if (currentPath.startsWith("/profile/") || currentPath.startsWith("/perfil/")) {
    const userId = decodeURIComponent(currentPath.split("/").filter(Boolean)[1] || "");
    return { page: "profile", data: { userId } };
  }
  if (currentPath.startsWith("/ticket/")) {
    const ticketCode = decodeURIComponent(currentPath.split("/").filter(Boolean)[1] || "");
    return { page: "ticket", data: { ticketCode, ticketToken: urlParams.get("s") || urlParams.get("token") || "" } };
  }
  if (currentPath.startsWith("/success")) {
    return { page: "success", data: { status: "success", sessionId: urlParams.get("session_id") || "" } };
  }
  if (currentPath.startsWith("/error")) return { page: "error", data: { status: "error" } };

  const staticRoutes = {
    "/eventos": "eventos",
    "/events": "events",
    "/eventshub": "eventsHub",
    "/events-hub": "eventsHub",
    "/past-events": "pastEvents",
    "/eventos-passados": "pastEvents",
    "/about": "about",
    "/quem-somos": "about",
    "/terms": "terms",
    "/termos": "terms",
    "/privacy": "privacy",
    "/privacidade": "privacy",
    "/ranking": "ranking",
    "/parceiros": "parceiros",
    "/auth": "auth",
    "/login": "auth",
    "/tapresult": "tapResult",
    "/tap-result": "tapResult",
    "/pending": "pending",
    "/faq": "faq",
    "/blog": "blog",
    "/account": "account",
    "/perfil": "account",
    "/checkout": "checkout",
  };

  return {
    page: staticRoutes[currentPath.toLowerCase()] || "home",
    data: { initialTab: urlParams.get("tab") || "" },
  };
}

function pageToPath(newPage, data = {}) {
  if (newPage === "home") return "/";
  if (newPage === "adminLogin" || newPage === "adminDashboard") return "/admin";
  if (newPage === "eventDetail") return `/eventos/${encodeURIComponent(data.eventId || "")}`;
  if (newPage === "blogPost") return `/blog/${encodeURIComponent(data.slug || data.postId || "")}`;
  if (newPage === "profile") return `/profile/${encodeURIComponent(data.userId || "")}`;
  if (newPage === "ticket") {
    const query = data.ticketToken ? `?s=${encodeURIComponent(data.ticketToken)}` : "";
    return `/ticket/${encodeURIComponent(data.ticketCode || "")}${query}`;
  }
  if (newPage === "account" && data.initialTab) return `/account?tab=${encodeURIComponent(data.initialTab)}`;
  const paths = {
    eventsHub: "/eventsHub",
    pastEvents: "/past-events",
    tapResult: "/tap-result",
  };
  return paths[newPage] || `/${newPage}`;
}

function setMetaTag(selector, attr, value) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    const [, key, name] = selector.match(/meta\[(.+?)=["'](.+?)["']\]/) || [];
    if (key && name) tag.setAttribute(key, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute(attr, value);
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState("home");
  const [pageData, setPageData] = useState({});
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
  const [updateServiceWorker, setUpdateServiceWorker] = useState(null);

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
                      const emailAdmin = !!(ADMIN_EMAIL && currentEmail === ADMIN_EMAIL)
                        || !!(ADMIN_EMAIL_2 && currentEmail === ADMIN_EMAIL_2)
                        || !!(ADMIN_UID && currentUser.uid === ADMIN_UID);
                      setIsAdminUi(isAdminClaim || emailAdmin);
                    } catch (err) {
                console.warn("getIdTokenResult falhou, usando verificação por email como fallback:", err);
                const currentEmail = currentUser && currentUser.email ? currentUser.email.trim().toLowerCase() : "";
                const normalizedAdmin = (ADMIN_EMAIL || "").trim().toLowerCase();
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
          const emailAdmin = !!(ADMIN_EMAIL && currentEmail === ADMIN_EMAIL)
            || !!(ADMIN_EMAIL_2 && currentEmail === ADMIN_EMAIL_2)
            || !!(ADMIN_UID && currentUser.uid === ADMIN_UID);
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
      const nextRoute = routeToPage(location);
      setPageData((prev) => ({ ...prev, ...nextRoute.data }));
      setPage(nextRoute.page);
    } catch (err) {
      console.warn("Erro ao determinar rota atual:", err);
      setPage("home");
    }
  }, [location.pathname, location.search]);

    useEffect(() => {
        if (!firebaseInitialized || !db) return;

    const excursionsRef = collection(db, "excursions");
    const blogRef = collection(db, "blogPosts");
    const faqsRef = collection(db, "faqs");

    const unsubscribeExcursions = onSnapshot(query(excursionsRef, orderBy("date", "desc")), (snapshot) => {
      // Sincroniza com o Firestore. Se estiver vazio, o estado refletirá isso.
      const excursionsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEventos(excursionsData.length > 0 ? excursionsData : initialEvents);
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
          unsubscribeExcursions();
          unsubscribeBlog();
          unsubscribeFaqs();
        };
    }, [firebaseInitialized]);


  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") !== "false";
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    const onUpdate = (event) => {
      if (event.detail?.updateServiceWorker) {
        setUpdateServiceWorker(() => event.detail.updateServiceWorker);
      }
    };
    window.addEventListener("itacars:pwa-update", onUpdate);
    return () => window.removeEventListener("itacars:pwa-update", onUpdate);
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

  useEffect(() => {
    const currentEvent = page === "eventDetail"
      ? eventos.find((e) => String(e.id) === String(pageData.eventId))
      : null;
    const currentPost = page === "blogPost"
      ? blogPosts.find((p) =>
          (pageData.postId && String(p.id) === String(pageData.postId)) ||
          (pageData.slug && (String(p.id) === String(pageData.slug) || p.slug === pageData.slug))
        )
      : null;
    const titles = {
      home: "Itajobi Cars Club - Eventos Automotivos",
      eventsHub: "Eventos - Itajobi Cars Club",
      eventos: "Eventos - Itajobi Cars Club",
      events: "Eventos - Itajobi Cars Club",
      pastEvents: "Eventos Passados - Itajobi Cars Club",
      about: "Quem Somos - Itajobi Cars Club",
      blog: "Blog - Itajobi Cars Club",
      faq: "FAQ - Itajobi Cars Club",
      ranking: "Hall da Fama - Itajobi Cars Club",
      parceiros: "Parceiros - Itajobi Cars Club",
      ticket: "Ingresso - Itajobi Cars Club",
      account: "Minha Conta - Itajobi Cars Club",
      adminDashboard: "Painel Admin - Itajobi Cars Club",
    };
    const title = currentEvent?.name
      ? `${currentEvent.name} - Itajobi Cars Club`
      : currentPost?.title
      ? `${currentPost.title} - Itajobi Cars Club`
      : titles[page] || "Itajobi Cars Club";
    const description = currentEvent?.description
      || currentPost?.summary
      || "Eventos automotivos, encontros e comunidade do Itajobi Cars Club.";

    document.title = title;
    setMetaTag('meta[name="description"]', "content", description);
    setMetaTag('meta[property="og:title"]', "content", title);
    setMetaTag('meta[property="og:description"]', "content", description);
    setMetaTag('meta[property="og:url"]', "content", window.location.href);
    if (currentEvent?.image || currentPost?.imageUrl) {
      setMetaTag('meta[property="og:image"]', "content", currentEvent?.image || currentPost?.imageUrl);
    }
  }, [page, pageData, eventos, blogPosts]);

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
            const emailAdmin = !!(ADMIN_EMAIL && currentEmail === ADMIN_EMAIL)
              || !!(ADMIN_EMAIL_2 && currentEmail === ADMIN_EMAIL_2)
              || !!(ADMIN_UID && currentUser.uid === ADMIN_UID);
            setIsAdminUi(isAdminClaim || emailAdmin);
          } catch (err) {
            console.warn("Falha ao ler claims após refresh:", err);
          }
        }
      } catch (err) {
        console.warn("Não foi possível forçar refresh do token antes de navegar para admin:", err);
      }
    }

    const path = pageToPath(newPage, data);

    if ((newPage === "adminLogin" || newPage === "adminDashboard") && !authReady) {
      setPageData(data);
      setPage(newPage);
      return;
    }

    navigate(path);
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
      const excursionsCollectionRef = collection(db, "excursions");
        const docRef = await addDoc(excursionsCollectionRef, newEventoData);
        const finalEvento = { 
            id: docRef.id, 
        ...newEventoData,
        };

        await setDoc(docRef, { id: docRef.id }, { merge: true });
        
        await logActivity(auth.currentUser?.email, "CRIAR_EVENTO", `Criou evento: ${newEventoData.name}`);

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
    const excursionsDocRef = doc(db, "excursions", String(id));
    await setDoc(excursionsDocRef, data, { merge: true });
    await logActivity(auth.currentUser?.email, "EDITAR_EVENTO", `Editou evento: ${data.name || id}`);
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
      const excursionsDocRef = doc(db, "excursions", stringId);
        await deleteDoc(excursionsDocRef);
        await logActivity(auth.currentUser?.email, "EXCLUIR_EVENTO", `Excluiu evento ID: ${stringId}`);
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
            user={user}
          />
        );
      case "pending":
        return (
          <PaginaStatusPagamento
            onNavigate={handleNavigate}
            status="pending"
            user={user}
          />
        );
      case "error":
        return (
          <PaginaStatusPagamento onNavigate={handleNavigate} status="error" user={user} />
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
      case "ticket":
        return (
          <PaginaIngresso
            ticketCode={pageData.ticketCode}
            ticketToken={pageData.ticketToken}
            onNavigate={handleNavigate}
          />
        );
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
          <React.Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-950">
              <Spinner />
            </div>
          }>
            <PainelAdministrativo
              onNavigate={handleNavigate}
              eventos={eventos}
              onAddEvento={addEvento}
              onUpdateEvento={updateEvento}
              onDeleteEvento={deleteEvento}
              onLogout={handleLogout}
            />
          </React.Suspense>
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
      case "ranking":
        return <PaginaRanking onNavigate={handleNavigate} />;
      case "parceiros":
        return <PaginaParceiros onNavigate={handleNavigate} />;
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
      {updateServiceWorker && (
        <div className="fixed left-4 right-4 bottom-4 z-[9999] mx-auto max-w-xl rounded-lg border border-yellow-500/40 bg-zinc-900 text-white shadow-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-bold">Nova versao disponivel</p>
            <p className="text-sm text-zinc-300">Atualize para carregar as ultimas correcoes do site.</p>
          </div>
          <button
            className="px-4 py-2 rounded-md bg-yellow-500 text-zinc-950 font-bold hover:bg-yellow-400"
            onClick={() => updateServiceWorker(true)}
          >
            Atualizar
          </button>
        </div>
      )}
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
