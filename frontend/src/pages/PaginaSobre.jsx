import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Button, Card, Input, PageWrapper, Spinner } from "../components/AppPrimitives";

export default function PaginaSobre() {
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSending, setIsSending] = useState(false);

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      toast.success("Sua mensagem foi enviada com sucesso!");
      setContactForm({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-zinc-800 dark:text-white mb-6">Sobre o Itajobi Cars Club</h1>
            <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 space-y-4">
              <h2 className="text-2xl font-bold mt-8 mb-4">Nossa História</h2>
              <p>Fundado em 2022 por um grupo de amigos apaixonados por carros, o Itajobi Cars Club nasceu do desejo de unir entusiastas da região, compartilhar conhecimento e organizar eventos memoráveis. O que começou como encontros informais de fim de semana, rapidamente se transformou em um clube automotivo dedicado a criar experiências únicas para seus membros.</p>
              <h2 className="text-2xl font-bold mt-8 mb-4">Nossa Missão</h2>
              <p>Nossa missão é simples: promover a cultura automotiva, conectando pessoas através da paixão por carros, sempre com foco na segurança, amizade e respeito. Acreditamos que um carro é mais do que um meio de transporte; é uma forma de expressão, uma fonte de alegria e um elo para grandes amizades.</p>
            </div>
          </Card>

          <Card className="p-8 md:p-12 mt-8">
            <h2 className="text-3xl font-bold text-zinc-800 dark:text-white mb-6">Fale Conosco</h2>
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Input name="name" placeholder="Seu Nome" value={contactForm.name} onChange={handleContactChange} required />
                <Input name="email" type="email" placeholder="Seu E-mail" value={contactForm.email} onChange={handleContactChange} required />
              </div>
              <Input name="subject" placeholder="Assunto" value={contactForm.subject} onChange={handleContactChange} required />
              <textarea
                name="message"
                placeholder="Sua Mensagem"
                value={contactForm.message}
                onChange={handleContactChange}
                rows="5"
                className="w-full px-4 py-3 bg-white dark:bg-zinc-800 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 focus:border-yellow-500 focus:ring-0 transition-all"
                required
              />
              <Button type="submit" disabled={isSending} className="w-full md:w-auto">
                {isSending ? <><Spinner /> Enviando...</> : "Enviar Mensagem"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

