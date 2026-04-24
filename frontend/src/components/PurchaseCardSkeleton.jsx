// src/components/PurchaseCardSkeleton.jsx
import React from 'react';

const PurchaseCardSkeleton = () => (
    <div className="bg-white/90 dark:bg-zinc-900/90 p-6 flex flex-col md:flex-row items-start md:items-center gap-6 rounded-2xl shadow-lg animate-pulse">
        <div className="w-full md:w-48 h-48 md:h-32 bg-zinc-300 dark:bg-zinc-800 rounded-lg"></div>
        <div className="flex-grow w-full">
            <div className="h-4 w-1/3 bg-zinc-300 dark:bg-zinc-800 rounded mb-3"></div>
            <div className="h-6 w-3/4 bg-zinc-300 dark:bg-zinc-800 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-zinc-300 dark:bg-zinc-800 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-zinc-300 dark:bg-zinc-800 rounded"></div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto mt-4 md:mt-0">
            <div className="h-4 w-20 bg-zinc-300 dark:bg-zinc-800 rounded mb-2 ml-auto"></div>
            <div className="h-8 w-28 bg-zinc-300 dark:bg-zinc-800 rounded ml-auto"></div>
        </div>
    </div>
);

export default PurchaseCardSkeleton;