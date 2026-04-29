import React from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";

export const Card = ({ children, className = "" }) => (
  <motion.div
    className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden transition-colors duration-300 border border-zinc-200/50 dark:border-zinc-800/50 ${className}`}
  >
    {children}
  </motion.div>
);

export const Button = ({
  children,
  onClick,
  className = "",
  variant = "primary",
  disabled = false,
  type = "button",
}) => {
  const variants = {
    primary:
      "bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:shadow-xl hover:shadow-yellow-500/40 focus:ring-amber-400",
    secondary:
      "bg-transparent text-amber-600 border-2 border-amber-600 hover:bg-amber-50 dark:text-yellow-400 dark:border-yellow-400 dark:hover:bg-yellow-400/10 focus:ring-yellow-400 transition-colors",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-300",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-6 py-3 font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${variants[variant]} ${className}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Spinner = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 50 50"
    className="inline-block align-middle"
  >
    <circle
      cx="25"
      cy="25"
      r="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray="31.4 31.4"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 25 25"
        to="360 25 25"
        dur="0.9s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);

export const PageWrapper = ({ children }) => (
  <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
    <Toaster position="top-right" />
    {children}
  </div>
);

export const Input = ({ icon: Icon, className = "", ...props }) => (
  <div className={`flex items-center gap-3 w-full ${className}`}>
    {Icon && <Icon className="text-zinc-400" />}
    <input
      {...props}
      className={`flex-1 px-4 py-2 rounded-lg border bg-white dark:bg-zinc-800 min-w-0 ${props.className || ""}`}
    />
  </div>
);

