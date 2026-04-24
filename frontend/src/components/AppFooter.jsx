import React, { useState } from "react";
import { Facebook, Instagram, Phone } from "lucide-react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Button, Spinner } from "./AppPrimitives";

export default function AppFooter({ onNavigate, db }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !/\S+@\S+\.\S+/.test(newsletterEmail)) {
      toast.error("Por favor, insira um e-mail válido.");
      return;
    }
    if (!db) {
      toast.error("Serviço indisponível. Tente mais tarde.");
      return;
    }
    setIsSubscribing(true);
    try {
      const subscriberRef = doc(db, "newsletterSubscribers", newsletterEmail);
      await setDoc(subscriberRef, {
        email: newsletterEmail,
        subscribedAt: serverTimestamp(),
      });
      toast.success("Inscrição realizada com sucesso! Obrigado.");
      setNewsletterEmail("");
    } catch (error) {
      console.error("Erro ao inscrever na newsletter:", error);
      toast.error("Ocorreu um erro. Tente novamente.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-zinc-900 text-zinc-300">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center cursor-pointer mb-4" onClick={() => onNavigate("home")}>
              <img src="/assets/logo.png" alt="Itajobi Cars Club Logo" className="h-40 w-auto" />
            </div>
            <p className="mt-4 text-zinc-400">Sua paixão, nossa comunidade. Acelerando juntos.</p>
            <div className="mt-4 flex space-x-4">
              <a href="http://instagram.com/itajobicarsclub" className="text-zinc-400 hover:text-yellow-400"><Instagram size={30} /></a>
              <a href="#" className="text-zinc-400 hover:text-yellow-400"><Facebook size={30} /></a>
              <a href="http://wa.me/5517996133907" className="text-zinc-400 hover:text-yellow-400"><Phone size={30} /></a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Navegação</h3>
            <ul className="mt-4 space-y-2">
              <li><a onClick={() => onNavigate("home")} className="hover:text-yellow-400 cursor-pointer">Início</a></li>
              <li><a onClick={() => onNavigate("eventsHub")} className="hover:text-yellow-400 cursor-pointer">Eventos</a></li>
              <li><a onClick={() => onNavigate("about")} className="hover:text-yellow-400 cursor-pointer">Quem Somos Nós</a></li>
              <li><a onClick={() => onNavigate("blog")} className="hover:text-yellow-400 cursor-pointer">Blog</a></li>
              <li><a onClick={() => onNavigate("faq")} className="hover:text-yellow-400 cursor-pointer">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Legal</h3>
            <ul className="mt-4 space-y-2">
              <li><a onClick={() => onNavigate("terms")} className="hover:text-yellow-400 cursor-pointer">Termos de Serviço</a></li>
              <li><a onClick={() => onNavigate("privacy")} className="hover:text-yellow-400 cursor-pointer">Política de Privacidade</a></li>
            </ul>
            <h3 className="text-lg font-semibold text-white mt-6">Parceiros</h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-3"><img src="/assets/prc1.png" alt="Logo Parceiro 1" className="bg-zinc-700 rounded-full h-14" /><span className="text-zinc-400">ART METAL</span></li>
              <li className="flex items-center gap-3"><img src="/assets/prc2.png" alt="Logo Parceiro 2" className="bg-zinc-700 rounded-full h-14" /><span className="text-zinc-400">Bar do Pico</span></li>
              <li className="flex items-center gap-3"><img src="/assets/prc3.png" alt="Logo Parceiro 3" className="bg-zinc-700 rounded-full h-14" /><span className="text-zinc-400">ITAJOBICARSCLUB</span></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Newsletter</h3>
            <p className="mt-4 text-zinc-400">Fique por dentro dos próximos eventos e novidades do clube.</p>
            <form onSubmit={handleNewsletterSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 bg-zinc-800 border-zinc-700 text-white focus:border-yellow-500 focus:ring-0 transition-colors"
                required
              />
              <Button type="submit" variant="secondary" disabled={isSubscribing} className="px-4">
                {isSubscribing ? <Spinner size={20} /> : "Inscrever"}
              </Button>
            </form>
          </div>
        </div>
        <div className="mt-8 border-t border-zinc-800 pt-8 text-center text-zinc-400">
          <p>&copy; {new Date().getFullYear()} Itajobi Cars Club. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

