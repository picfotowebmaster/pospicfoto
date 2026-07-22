"use client";

import { useOffline } from "@/lib/offline/useOffline";
import { useEffect, useState } from "react";
import { getQueueCount } from "@/lib/offline/orderQueue";

export default function OfflineIndicator() {
  const { isOnline } = useOffline();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getQueueCount().then(setPendingCount).catch(() => {});
  }, [isOnline]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isOnline ? "bg-green-500" : "bg-red-500"
        }`}
        title={isOnline ? "Conectado" : "Sin conexión"}
      />
      <span className="text-gray-500 dark:text-gray-400">
        {isOnline ? "En línea" : "Offline"}
      </span>
      {!isOnline && pendingCount > 0 && (
        <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
          {pendingCount}
        </span>
      )}
    </span>
  );
}
