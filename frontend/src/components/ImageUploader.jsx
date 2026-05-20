import React, { useState, useRef } from "react";
import { Upload, Link as LinkIcon } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";
import { Input, Button, Spinner } from "./AppPrimitives";
import { toast } from "react-hot-toast";

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
      const optimizedFile = await compressImageToWebP(file);
      const filename = `${uploadPath}/${Date.now()}_${optimizedFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const storageRef = ref(storage, filename);
      
      const snapshot = await uploadBytes(storageRef, optimizedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      onChange(downloadURL);
      toast.success("Imagem enviada com sucesso!", { id: loadingToast });
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Falha ao fazer upload da imagem.", { id: loadingToast });
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
