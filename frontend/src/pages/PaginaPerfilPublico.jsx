import React, { useState, useEffect } from "react";
import { collection, doc, getDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Card, Spinner, PageWrapper } from "../components/AppPrimitives";

export default function PaginaPerfilPublico({ userId, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        const ordersColRef = collection(db, "users", userId, "orders");
        const ordersSnap = await getDocs(query(ordersColRef, orderBy("purchaseDate", "desc")));
        const userOrders = ordersSnap.docs.map((d) => ({ type: "order", ...d.data() }));

        const commentsColRef = collection(db, "userComments", userId, "comments");
        const commentsSnap = await getDocs(query(commentsColRef, orderBy("createdAt", "desc")));
        const userComments = commentsSnap.docs.map((d) => ({ type: "comment", ...d.data() }));

        const allActivities = [...userOrders, ...userComments].sort((a, b) => {
          const dateA = a.purchaseDate?.toDate() || a.createdAt?.toDate();
          const dateB = b.purchaseDate?.toDate() || b.createdAt?.toDate();
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB - dateA;
        });

        setActivities(allActivities.slice(0, 10));

        const carsColRef = collection(db, "users", userId, "cars");
        const carsSnap = await getDocs(carsColRef);
        setCars(carsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erro ao buscar perfil público:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  if (loading)
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  if (!profile)
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <p>Perfil não encontrado.</p>
      </div>
    );

  return (
    <PageWrapper>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 text-black flex items-center justify-center font-bold text-3xl flex-shrink-0">
              {(profile.fullName || profile.displayName || "M").charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold">
              Perfil de {profile.fullName || profile.displayName || "Membro"}
            </h1>
          </div>
          <Card className="p-8">
            <h2 className="text-2xl font-bold mb-4">Meus Carros</h2>
            {cars.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {cars.map((car) => (
                  <div key={car.id} className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                    <img
                      src={car.photoURL || "https://via.placeholder.com/400x300?text=Sem+Foto"}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-40 object-cover rounded-md mb-4"
                    />
                    <h3 className="font-bold text-lg">
                      {car.make} {car.model}
                    </h3>
                    <p className="text-zinc-500">{car.year}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500">Este membro ainda não adicionou nenhum carro.</p>
            )}
          </Card>

          <Card className="p-8 mt-8">
            <h2 className="text-2xl font-bold mb-4">Atividade Recente</h2>
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div key={index} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm">
                    {activity.type === "comment" && (
                      <p>
                        Comentou no post{" "}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onNavigate("blogPost", { postId: activity.postId });
                          }}
                          className="font-bold hover:underline"
                        >
                          "{activity.postTitle}"
                        </a>
                        : <em>"{activity.text.substring(0, 50)}..."</em>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500">Nenhuma atividade recente.</p>
            )}
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
