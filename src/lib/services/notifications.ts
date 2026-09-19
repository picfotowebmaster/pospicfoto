import { supabase } from "../supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  return Notification.requestPermission();
}

export async function subscribeToPush(
  userId: string,
): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(userId, existing);
    return existing;
  }

  const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidKey as unknown as ArrayBuffer,
  });

  await saveSubscription(userId, subscription);
  return subscription;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await deleteSubscription(userId, subscription.endpoint);
    await subscription.unsubscribe();
  }
}

async function saveSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh || "";
  const auth = json.keys?.auth || "";

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
    },
    { onConflict: "user_id, endpoint" },
  );

  if (error) console.error("Error saving push subscription:", error);
}

async function deleteSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) console.error("Error deleting push subscription:", error);
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
