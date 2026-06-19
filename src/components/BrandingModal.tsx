import React, { useState, useRef } from "react";
import { NurseryUser } from "../types";
import { X, Upload, Check, RefreshCw, AlertCircle, Image as ImageIcon, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { saveItem } from "../lib/firebase";

interface BrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: NurseryUser;
  usersList: NurseryUser[];
  appLogo: string;
}

// Inline image resizing helper using HTML5 Canvas to produce optimized, lightweight WebP compressed base64 string
const resizeImage = (base64Str: string, maxWidth = 192, maxHeight = 192): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.7)); // WebP with 70% quality compression
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export default function BrandingModal({
  isOpen,
  onClose,
  currentUser,
  usersList,
  appLogo,
}: BrandingModalProps) {
  const [selectedUserForAvatar, setSelectedUserForAvatar] = useState<string>(currentUser.id);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [avatarDragActive, setAvatarDragActive] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const targetUser = usersList.find((u) => u.id === selectedUserForAvatar) || currentUser;

  // File to Base64 handoff
  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const showFeedback = (text: string, type: "success" | "error") => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Logo upload processing
  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showFeedback("Please select an image file (PNG, JPG, SVG, WebP, etc.)", "error");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const rawBase64 = await processFile(file);
      // Let's compress slightly larger files (like SVG are small, but raw PNG/JPG should be optimized)
      // If SVG, save directly, otherwise resize & compress
      let processedBase64 = rawBase64;
      if (!file.type.includes("svg")) {
        processedBase64 = await resizeImage(rawBase64, 256, 256);
      }

      await saveItem("settings", "branding", { id: "branding", logoUrl: processedBase64 });
      showFeedback("System branding logo updated successfully in real-time!", "success");
    } catch (err) {
      console.error(err);
      showFeedback("Could not save the branding logo. Please try a smaller image.", "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    try {
      setIsUploadingLogo(true);
      // Remove branding from Firestore settings collection
      await saveItem("settings", "branding", { id: "branding", logoUrl: null });
      showFeedback("Branding logo reset back to default /logo.svg successfully!", "success");
    } catch (err) {
      console.error(err);
      showFeedback("Could not reset the logo. Please try again.", "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Avatar/Display picture upload processing
  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showFeedback("Please select an image file (PNG, JPG, WebP)", "error");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const rawBase64 = await processFile(file);
      const optimizedBase64 = await resizeImage(rawBase64, 180, 180);

      // Save user details with new avatarImage to Firestore users collection
      const updatedUser = {
        ...targetUser,
        avatarImage: optimizedBase64,
      };

      await saveItem("users", targetUser.id, updatedUser);
      showFeedback(`Display picture for "${targetUser.username}" updated successfully!`, "success");
    } catch (err) {
      console.error(err);
      showFeedback("Could not save display picture. Please try again.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleClearAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      const updatedUser = {
        ...targetUser,
        avatarImage: null,
      };
      
      await saveItem("users", targetUser.id, updatedUser);
      showFeedback(`Display picture for ${targetUser.username} removed.`, "success");
    } catch (err) {
      console.error(err);
      showFeedback("Could not remove display picture.", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOverLogo = (e: React.DragEvent) => {
    e.preventDefault();
    setLogoDragActive(true);
  };

  const handleDragLeaveLogo = (e: React.DragEvent) => {
    e.preventDefault();
    setLogoDragActive(false);
  };

  const handleDropLogo = (e: React.DragEvent) => {
    e.preventDefault();
    setLogoDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOverAvatar = (e: React.DragEvent) => {
    e.preventDefault();
    setAvatarDragActive(true);
  };

  const handleDragLeaveAvatar = (e: React.DragEvent) => {
    e.preventDefault();
    setAvatarDragActive(false);
  };

  const handleDropAvatar = (e: React.DragEvent) => {
    e.preventDefault();
    setAvatarDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAvatarUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-editorial-dark/60 backdrop-blur-xs select-none overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-white border border-editorial-primary/15 rounded-3xl p-6 md:p-8 shadow-2xl relative my-8"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-serif font-bold text-editorial-dark">
              Nursery Branding & Display Settings
            </h3>
            <p className="text-xs text-stone-500 font-serif italic mt-0.5">
              Authorized operators can customize the store logo and member pictures.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl mb-6 text-xs font-sans font-semibold flex items-center gap-2 ${
              feedbackMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {feedbackMessage.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </motion.div>
        )}

        {/* Dynamic Double Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo Section */}
          <div className="space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-xs font-sans uppercase tracking-widest font-extrabold text-editorial-primary">
                1. Application Logo
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5 leading-tight">
                Change the main nursery seal loaded at the top-left corner on all active tablets or devices.
              </p>
            </div>

            {/* Logo Preview box */}
            <div className="flex items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-100 min-h-[100px]">
              <div className="text-center">
                <img
                  src={appLogo}
                  alt="App Logo Preview"
                  className="w-16 h-16 md:w-20 md:h-20 object-contain mx-auto bg-stone-100/40 p-2 rounded-xl"
                  referrerPolicy="no-referrer"
                />
                <span className="block text-[10px] text-stone-400 font-mono mt-2">
                  {appLogo === "/logo.svg" ? "Original Default Vector" : "Custom Dynamic Graphic"}
                </span>
              </div>
            </div>

            {/* Logo Upload Dropzone */}
            <div
              onDragOver={handleDragOverLogo}
              onDragLeave={handleDragLeaveLogo}
              onDrop={handleDropLogo}
              onClick={() => logoInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                logoDragActive
                  ? "border-editorial-primary bg-editorial-primary/5"
                  : "border-stone-200 hover:border-editorial-primary hover:bg-stone-50/50"
              }`}
            >
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleLogoUpload(e.target.files[0]);
                }}
              />
              <Upload className="w-6 h-6 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-sans font-bold text-editorial-dark">
                Click or drag logo here
              </p>
              <p className="text-[10px] text-stone-400 mt-1">
                SVG, PNG, or JPG (optimal size 128x128)
              </p>
            </div>

            {appLogo !== "/logo.svg" && (
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={handleResetLogo}
                className="w-full py-2.5 rounded-xl border border-stone-200 hover:border-red-200 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 font-sans text-[10px] uppercase font-bold tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUploadingLogo ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Restore Default Vector Seal
              </button>
            )}
          </div>

          {/* Member Profile Avatar Section */}
          <div className="space-y-4">
            <div className="border-b border-stone-100 pb-2">
              <span className="text-xs font-sans uppercase tracking-widest font-extrabold text-editorial-primary">
                2. Member Display Pictures
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5 leading-tight">
                Select an operator account to assign, edit, or upload a real photo portrait.
              </p>
            </div>

            {/* Member operator selector */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-sans font-bold text-stone-500 mb-1">
                Select Operator Account:
              </label>
              <select
                className="w-full p-2 text-xs font-sans font-semibold rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-editorial-primary transition"
                value={selectedUserForAvatar}
                onChange={(e) => setSelectedUserForAvatar(e.target.value)}
              >
                {usersList.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Display Pic Preview box */}
            <div className="flex items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-100 min-h-[100px]">
              <div className="text-center flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold font-sans overflow-hidden shadow-xs shrink-0 select-none"
                  style={{ backgroundColor: targetUser.avatarImage ? undefined : targetUser.avatarColor }}
                >
                  {targetUser.avatarImage ? (
                    <img
                      src={targetUser.avatarImage}
                      alt={targetUser.username}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    targetUser.username.slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="block text-[10px] text-stone-450 font-mono mt-2 font-bold">
                  {targetUser.username}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-stone-400 mt-0.5">
                  {targetUser.role}
                </span>
              </div>
            </div>

            {/* Avatar Upload Dropzone */}
            <div
              onDragOver={handleDragOverAvatar}
              onDragLeave={handleDragLeaveAvatar}
              onDrop={handleDropAvatar}
              onClick={() => avatarInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                avatarDragActive
                  ? "border-editorial-primary bg-editorial-primary/5"
                  : "border-stone-200 hover:border-editorial-primary hover:bg-stone-50/50"
              }`}
            >
              <input
                type="file"
                ref={avatarInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleAvatarUpload(e.target.files[0]);
                }}
              />
              <Upload className="w-6 h-6 text-stone-400 mx-auto mb-2" />
              <p className="text-xs font-sans font-bold text-editorial-dark">
                Click or drag portrait photo
              </p>
              <p className="text-[10px] text-stone-400 mt-1">
                PNG, JPG, or WebP (optimal square photo)
              </p>
            </div>

            {targetUser.avatarImage && (
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={handleClearAvatar}
                className="w-full py-2.5 rounded-xl border border-stone-200 hover:border-red-200 bg-white hover:bg-red-50 text-red-655 font-sans text-[10px] uppercase font-bold tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isUploadingAvatar ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Clear portrait & fallback to color badge
              </button>
            )}
          </div>
        </div>

        {/* Modal controls */}
        <div className="border-t border-stone-100 pt-5 mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-editorial-primary text-white hover:bg-editorial-dark rounded-xl font-sans text-xs uppercase font-extrabold tracking-widest transition cursor-pointer shadow-xs"
          >
            Finished Editing
          </button>
        </div>
      </motion.div>
    </div>
  );
}
