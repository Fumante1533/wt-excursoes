import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Users,
} from "lucide-react";
import { collectionGroup, limit, getDocs, query, orderBy } from "firebase/firestore";
import { Button, Spinner, PageWrapper, Card } from "../components/AppPrimitives";
import { CartaoEvento, EsqueletoCartaoEvento } from "../components/CartaoEvento";

export default function PaginaInicial({ onNavigate, eventos, user, db }) {
  const upcomingEvents = eventos
    .filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const pastEvents = eventos
    .filter((e) => new Date(e.date) < new Date())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    if (!db) return;

    const fetchActivities = async () => {
      try {
        const commentsQuery = query(
          collectionGroup(db, "comments"),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const ordersQuery = query(
          collectionGroup(db, "orders"),
          orderBy("purchaseDate", "desc"),
          limit(5)
        );

        const [commentsSnap, ordersSnap] = await Promise.all([
          getDocs(commentsQuery).catch((err) => {
            console.warn("Permissão de comments falhou ou outro erro:", err.message);
            return { docs: [] };
          }),
          getDocs(ordersQuery).catch((err) => {
            console.warn("Permissão de orders falhou ou outro erro:", err.message);
            return { docs: [] };
          }),
        ]);

        const commentsData = commentsSnap.docs.map((d) => ({
          type: "comment",
          ...d.data(),
        }));
        const ordersData = ordersSnap.docs.map((d) => ({
          type: "order",
          ...d.data(),
        }));

        const allActivities = [...commentsData, ...ordersData].sort((a, b) => {
          const dateA = a.createdAt?.toDate() || a.purchaseDate?.toDate();
          const dateB = b.createdAt?.toDate() || b.purchaseDate?.toDate();
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB - dateA;
        });

        setActivities(allActivities.slice(0, 5));
      } catch (error) {
        console.error("Erro ao buscar atividades da comunidade:", error);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [db]);

  return (
    <PageWrapper>
      <section
        className="relative h-screen flex items-center justify-center text-white text-center bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1605516284242-561500373c19?q=80&w=2070&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20"></div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 p-4"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4 drop-shadow-2xl">
            Paixão por Motores, <br />
            União em Asfalto.
          </h1>
          <p className="text-lg md:text-2xl max-w-3xl mx-auto mb-8 drop-shadow-lg">
            Descubra eventos incríveis e viva experiências únicas com o Itajobi Cars Club.
          </p>
          <Button onClick={() => onNavigate("events")} className="text-lg">
            Ver Próximos Eventos <ArrowRight className="inline ml-2" />
          </Button>
        </motion.div>
      </section>

      {nextEvent && (
        <section className="py-20 bg-zinc-900 text-white" data-has-aurora>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
              Nosso Próximo <span className="text-yellow-400">Encontro</span>
            </h2>
            <p className="text-center text-zinc-400 mb-12">
              Não fique de fora! Acelere com a gente no nosso principal evento do calendário.
            </p>
            <Card className="grid md:grid-cols-2 gap-0 overflow-hidden border-yellow-500/20">
              <img
                src={nextEvent.image}
                alt={nextEvent.name}
                className="w-full h-full object-cover min-h-[300px]"
              />
              <div className="p-8 flex flex-col justify-center">
                <p className="text-yellow-400 font-bold mb-2">{nextEvent.category}</p>
                <h3 className="text-3xl font-bold mb-4">{nextEvent.name}</h3>
                <div className="flex flex-wrap items-center text-zinc-400 mb-4 gap-6 gap-y-2">
                  <span className="flex items-center gap-2">
                    <MapPin size={16} /> {nextEvent.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar size={16} />{" "}
                    {new Date(nextEvent.date).toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </span>
                  {nextEvent.time && (
                    <span className="flex items-center gap-2">
                      <Clock size={16} /> {nextEvent.time} {nextEvent.timeEnd && `às ${nextEvent.timeEnd}`}
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 mb-8">{nextEvent.description}</p>
                <Button
                  onClick={() => onNavigate("eventDetail", { eventId: nextEvent.id })}
                  className="self-start"
                >
                  Quero Participar <ArrowRight className="inline ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        </section>
      )}

      <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-12">
            Relembre Nossos <span className="text-yellow-400">Encontros</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {pastEvents.length === 0
              ? Array.from({ length: 3 }).map((_, i) => <EsqueletoCartaoEvento key={i} />)
              : pastEvents.map((ex, i) => (
                  <CartaoEvento
                    key={ex.id}
                    event={ex}
                    onNavigate={onNavigate}
                    user={user}
                    db={db}
                    index={i}
                  />
                ))}
          </div>
        </div>
      </section>
      <section className="py-24 bg-zinc-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
            Atividade da <span className="text-yellow-400">Comunidade</span>
          </h2>
          <div className="space-y-4">
            {loadingActivities ? (
              <div className="flex justify-center">
                <Spinner />
              </div>
            ) : activities.length > 0 ? (
              activities.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-zinc-800/50 rounded-lg flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 text-black flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {activity.userName?.charAt(0).toUpperCase() ||
                      activity.buyerInfo?.fullName?.charAt(0).toUpperCase() ||
                      "?"}
                  </div>
                  <div>
                    {activity.type === "comment" && (
                      <p>
                        <span className="font-bold">{activity.userName}</span> comentou no post{" "}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate("blogPost", { postId: activity.postId });
                          }}
                          className="font-semibold text-yellow-400 hover:underline"
                        >
                          "{activity.postTitle}"
                        </a>
                      </p>
                    )}
                    {activity.type === "order" && (
                      <p>
                        <span className="font-bold">{activity.buyerInfo.fullName}</span> se inscreveu no evento{" "}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate("eventDetail", { eventId: activity.items[0].eventoId });
                          }}
                          className="font-semibold text-yellow-400 hover:underline"
                        >
                          {activity.items[0].eventoName}
                        </a>
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      {new Date(
                        (activity.createdAt || activity.purchaseDate)?.toDate()
                      ).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-center text-zinc-400">Nenhuma atividade recente. Seja o primeiro!</p>
            )}
          </div>
        </div>
      </section>
      <section className="bg-white dark:bg-zinc-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-16">
            Por Que Fazer Parte do Clube?
          </h2>
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-5 rounded-2xl mb-6 shadow-lg shadow-yellow-500/20">
                <ShieldCheck className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">Eventos Seguros</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Priorizamos a segurança em todos os eventos, com equipe qualificada e regras claras.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-5 rounded-2xl mb-6 shadow-lg shadow-yellow-500/20">
                <Briefcase className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">Comunidade Forte</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Conecte-se com outros apaixonados por carros, troque experiências e faça novas amizades.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-gradient-to-br from-yellow-500 to-amber-500 p-5 rounded-2xl mb-6 shadow-lg shadow-yellow-500/20">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-white mb-2">Benefícios Exclusivos</h3>
              <p className="text-zinc-600 dark:text-zinc-300">
                Membros do clube têm acesso a descontos em eventos, produtos e serviços de parceiros.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-white dark:bg-zinc-900 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-zinc-800 dark:text-white mb-12">
            Nossos <span className="text-yellow-400">Patrocinadores</span>
          </h2>
          <p className="text-lg text-center text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-16">
            Agradecemos imensamente aos nossos parceiros por acreditarem e apoiarem a cultura automotiva em nossa região.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
            <div className="grayscale hover:grayscale-0 transition-all duration-300">
              <img src="/assets/prc1.png" alt="Logo Oficina do Zé" className="h-20" />
            </div>
            <div className="grayscale hover:grayscale-0 transition-all duration-300">
              <img src="/assets/prc2.png" alt="Logo Tuning Parts RP" className="h-20" />
            </div>
            <div className="grayscale hover:grayscale-0 transition-all duration-300">
              <img src="/assets/prc3.png" alt="Logo Detailing Master" className="h-20" />
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
