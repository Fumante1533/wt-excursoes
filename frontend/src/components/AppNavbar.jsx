import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, ShoppingBag, Sun, X } from "lucide-react";
import { Button } from "./AppPrimitives";

const ProfileDropdown = ({ user, onNavigate, onLogout }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800"
        title={user?.email}
      >
        {(() => {
          const name = user?.displayName || "U";
          const parts = name.split(" ").filter(Boolean);
          const initials =
            parts.length === 1
              ? parts[0].charAt(0)
              : parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
          return (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center font-bold text-lg">
              {initials.toUpperCase()}
            </div>
          );
        })()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg z-50">
          <button
            onClick={() => {
              setOpen(false);
              onNavigate("account");
            }}
            className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Minha Conta
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onNavigate("account", { initialTab: "purchases" });
            }}
            className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Minhas Inscrições
          </button>
          <div className="border-t border-zinc-100 dark:border-zinc-800" />
          <button
            onClick={() => {
              setOpen(false);
              onLogout && onLogout();
            }}
            className="w-full text-left px-4 py-2 text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Sair
          </button>
        </div>
      )}
    </div>
  );
};

export default function AppNavbar({
  onNavigate,
  darkMode,
  toggleDarkMode,
  user,
  onLogout,
  isAdmin,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navClass = `fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
    scrolled || menuOpen
      ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg shadow-md"
      : "bg-transparent"
  }`;
  const navLinkClass =
    "font-semibold text-zinc-600 dark:text-zinc-300 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors cursor-pointer";

  return (
    <header className={navClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-1 flex items-center justify-start">
            <div className="flex items-center cursor-pointer" onClick={() => onNavigate("home")}>
              <img src="/assets/logo.png" alt="Itajobi Cars Club Logo" fetchPriority="high" decoding="async" className="h-14 w-auto" />
            </div>
          </div>

          <div className="flex-1 hidden md:flex items-center justify-center space-x-8">
            <a onClick={() => onNavigate("home")} className={navLinkClass}>Início</a>
            <a onClick={() => onNavigate("eventsHub")} className={navLinkClass}>Eventos</a>
            <a onClick={() => onNavigate("about")} className={navLinkClass}>Quem Somos Nós</a>
            <a onClick={() => onNavigate("blog")} className={navLinkClass}>Blog</a>
            <a onClick={() => onNavigate("faq")} className={navLinkClass}>FAQ</a>
          </div>

          <div className="flex-1 flex items-center justify-end gap-2">
            {onNavigate.handleCartToggle && (
              <button
                onClick={onNavigate.handleCartToggle}
                className="relative p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <ShoppingBag />
                {onNavigate.cartCount > 0 && (
                  <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-violet-600 text-white text-xs font-bold text-center">
                    {onNavigate.cartCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              {darkMode ? <Sun /> : <Moon />}
            </button>

            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <ProfileDropdown user={user} onNavigate={onNavigate} onLogout={onLogout} />
              ) : (
                <Button onClick={() => onNavigate("auth")} variant="secondary" className="py-2 px-4">
                  Login
                </Button>
              )}
              {isAdmin && (
                <Button onClick={() => onNavigate("adminDashboard")} variant="secondary" className="py-2 px-4">
                  Painel
                </Button>
              )}
            </div>

            <div className="md:hidden ml-2">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                {menuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 flex flex-col items-center">
              <a onClick={() => { onNavigate("home"); setMenuOpen(false); }} className="w-full text-center block px-3 py-2 rounded-md text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-zinc-800">Início</a>
              <a onClick={() => { onNavigate("eventsHub"); setMenuOpen(false); }} className="w-full text-center block px-3 py-2 rounded-md text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-zinc-800">Eventos</a>
              <a onClick={() => { onNavigate("about"); setMenuOpen(false); }} className="w-full text-center block px-3 py-2 rounded-md text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-zinc-800">Quem Somos Nós</a>
              <a onClick={() => { onNavigate("blog"); setMenuOpen(false); }} className="w-full text-center block px-3 py-2 rounded-md text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-zinc-800">Blog</a>
              <a onClick={() => { onNavigate("faq"); setMenuOpen(false); }} className="w-full text-center block px-3 py-2 rounded-md text-base font-medium text-zinc-600 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-zinc-800">FAQ</a>
              <div className="border-t border-zinc-200 dark:border-zinc-700 w-full my-2" />
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <a onClick={() => { onNavigate("account"); setMenuOpen(false); }} className={navLinkClass}>Minha Conta</a>
                    <button onClick={onLogout} className={navLinkClass}>Sair</button>
                  </>
                ) : (
                  <a onClick={() => { onNavigate("auth"); setMenuOpen(false); }} className={navLinkClass}>Login/Registro</a>
                )}
                {isAdmin && <a onClick={() => { onNavigate("adminDashboard"); setMenuOpen(false); }} className={navLinkClass}>Painel</a>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

