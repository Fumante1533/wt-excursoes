import React, { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { auth } from "../firebaseConfig";
import { Input, Button, Spinner } from "./AppPrimitives";
import { toast } from "react-hot-toast";

const getUploadErrorMessage = (error) => {
  if (error?.code === "auth/unauthenticated") {
    return "Entre novamente para enviar a imagem.";
  }
  if (error?.message) {
    return error.message;
  }
  return "Falha ao fazer upload da imagem.";
};

const getBackendUrl = () =>
  (import.meta.env.VITE_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");

const uploadImage = async ({ backendUrl, token, file, uploadPath }) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("uploadPath", uploadPath);

  const response = await fetch(`${backendUrl}/api/user/upload-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (response.status !== 404) {
    return { response, data };
  }

  const fallbackData = new FormData();
  fallbackData.append("avatar", file);

  const fallbackResponse = await fetch(`${backendUrl}/api/user/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fallbackData,
  });
  const fallbackJson = await fallbackResponse.json().catch(() => ({}));

  return {
    response: fallbackResponse,
    data: fallbackJson.url?.startsWith("/")
      ? { ...fallbackJson, url: `${backendUrl}${fallbackJson.url}` }
      : fallbackJson,
  };
};

export const ImageUploader = ({ 
  value, 
  onChange, 
  placeholder = "URL da Imagem ou faça Upload", 
  className = "",
  uploadPath = "uploads" // Default path, but can be overridden
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const compressImageToWebP = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                  type: "image/webp",
                  lastModified: Date.now()
                }));
              } else {
                resolve(file);
              }
            },
            "image/webp",
            0.8
          );
        };
        img.onerror = () => resolve(file);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading("Otimizando e enviando imagem...");

    try {
      if (!auth?.currentUser) {
        const error = new Error("Usuario nao autenticado.");
        error.code = "auth/unauthenticated";
        throw error;
      }

      const optimizedFile = await compressImageToWebP(file);
      const token = await auth.currentUser.getIdToken(true);
      const { response, data } = await uploadImage({
        backendUrl: getBackendUrl(),
        token,
        file: optimizedFile,
        uploadPath,
      });

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Falha ao fazer upload da imagem.");
      }
      
      onChange(data.url);
      toast.success("Imagem enviada com sucesso!", { id: loadingToast });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error(getUploadErrorMessage(error), { id: loadingToast });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-2 items-stretch sm:items-center ${className}`}>
      <div className="relative flex-grow">
        <Input
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zinc-700 text-white border-zinc-600"
        />
      </div>
      
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      
      <Button 
        type="button" 
        variant="secondary" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2 border-zinc-500 text-zinc-300 hover:text-white hover:border-zinc-400 dark:border-zinc-600 dark:text-zinc-300 dark:hover:text-white"
        style={{ height: "42px" }}
      >
        {isUploading ? (
          <><Spinner size={16} /> Enviando...</>
        ) : (
          <><Upload size={16} /> Upload</>
        )}
      </Button>
    </div>
  );
};
