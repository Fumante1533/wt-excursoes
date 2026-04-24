import React from 'react';

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
      "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-xl hover:shadow-violet-500/30 focus:ring-violet-400",
    secondary:
      "bg-white dark:bg-zinc-800 text-violet-600 dark:text-white border-2 border-violet-600 dark:border-zinc-700 hover:bg-violet-50 dark:hover:bg-zinc-700 focus:ring-violet-300 dark:focus:ring-zinc-600",
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
    className="inline-block align-middle animate-spin"
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
    />
  </svg>
);