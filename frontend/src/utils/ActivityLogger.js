import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export const logActivity = async (action, details) => {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, "activity_logs"), {
      action,
      details,
      adminEmail: user?.email || "desconhecido",
      adminUid: user?.uid || "desconhecido",
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Erro ao registrar log de atividade:", error);
  }
};
