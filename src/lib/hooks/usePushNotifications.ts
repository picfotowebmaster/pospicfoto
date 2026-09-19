"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getVapidPublicKey,
} from "@/lib/services/notifications";

export function usePushNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported] = useState(() => isPushSupported());

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

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
      setPermission(perm);
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
