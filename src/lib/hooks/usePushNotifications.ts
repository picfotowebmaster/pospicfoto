"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/services/notifications";

// --- Store de permiso (hydration-safe) ---
const permissionListeners = new Set<() => void>();

let permissionCache: NotificationPermission =
  typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "default";

function subscribePermission(callback: () => void) {
  permissionListeners.add(callback);
  return () => permissionListeners.delete(callback);
}

function getPermissionSnapshot(): NotificationPermission {
  return permissionCache;
}

function getPermissionServerSnapshot(): NotificationPermission {
  return "default";
}

function actualizarPermission(permission: NotificationPermission) {
  permissionCache = permission;
  for (const listener of permissionListeners) listener();
}

// Soporte push: constante por entorno, con snapshot de servidor fijo.
function subscribeNoop() {
  return () => {};
}

export function usePushNotifications(userId: string | null) {
  const permission = useSyncExternalStore(
    subscribePermission,
    getPermissionSnapshot,
    getPermissionServerSnapshot,
  );
  const supported = useSyncExternalStore(subscribeNoop, isPushSupported, () => false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported || permission !== "granted" || !userId) return;

    navigator.serviceWorker.ready.then(async (registration) => {
      const sub = await registration.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, [supported, permission, userId]);

  const enable = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const perm = await requestNotificationPermission();
      actualizarPermission(perm);
      if (perm !== "granted") return;

      const sub = await subscribeToPush(userId);
      setSubscribed(!!sub);
    } catch (err) {
      console.error("Error enabling push notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const disable = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await unsubscribeFromPush(userId);
      setSubscribed(false);
    } catch (err) {
      console.error("Error disabling push notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const toggle = useCallback(async () => {
    if (subscribed) {
      await disable();
    } else {
      await enable();
    }
  }, [subscribed, enable, disable]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    enable,
    disable,
    toggle,
  };
}
