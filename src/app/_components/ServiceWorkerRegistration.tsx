"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then(
        (registration) => {
          console.log("[PWA] Service Worker registrado:", registration.scope);
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              console.log("[PWA] Nuevo SW encontrado, estado:", newWorker.state);
              newWorker.addEventListener("statechange", () => {
                console.log("[PWA] SW cambió a:", newWorker.state);
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] Activando nuevo SW...");
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        },
        (err) => {
          console.error("[PWA] Error al registrar SW:", err);
        },
      );

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("[PWA] SW controller cambió, recargando...");
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } else {
      console.warn("[PWA] Service Worker no soportado en este navegador");
    }
  }, []);

  return null;
}
