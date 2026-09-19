import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_SUBJECT = "mailto:admin@picphoto.com";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { title, body, url, tag } = await req.json();

    if (!title) {
      return new Response(JSON.stringify({ error: "title is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*");

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const vapidHeaders = await getVapidHeaders(publicKey, privateKey, VAPID_SUBJECT);

    const payload = JSON.stringify({
      title,
      body: body || "",
      url: url || "/produccion/kanban",
      tag: tag || "picphoto-general",
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
        try {
          const encrypted = await encryptPayload(payload, sub.p256dh, sub.auth, publicKey, privateKey);
          const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
              ...vapidHeaders,
              "Content-Type": "application/octet-stream",
              "Content-Encoding": "aes128gcm",
              "TTL": "86400",
            },
            body: encrypted,
          });

          if (!response.ok && response.status !== 201) {
            console.error(`Push failed for endpoint: ${sub.endpoint}, status: ${response.status}`);
            return { endpoint: sub.endpoint, status: "failed", code: response.status };
          }
          return { endpoint: sub.endpoint, status: "sent" };
        } catch (err) {
          console.error(`Error sending to ${sub.endpoint}:`, err);
          return { endpoint: sub.endpoint, status: "error" };
        }
      }),
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === "sent",
    ).length;

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, results }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function getVapidHeaders(
  publicKey: string,
  privateKey: string,
  subject: string,
): Promise<Record<string, string>> {
  const { encodeBase64Url } = await import("https://deno.land/std@0.168.0/encoding/base64url.ts");

  const publicKeyBytes = base64UrlToBytes(publicKey);
  const privateKeyBytes = base64UrlToBytes(privateKey);

  const keyPair = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(publicKeyBytes.slice(-32)),
      y: bytesToBase64Url(publicKeyBytes.slice(0, 32)),
      d: bytesToBase64Url(privateKeyBytes),
    },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"],
  );

  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: "https://fcm.googleapis.com",
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: subject,
  };

  const token = `${bytesToBase64Url(new TextEncoder().encode(JSON.stringify(header)))}.${bytesToBase64Url(new TextEncoder().encode(JSON.stringify(claims)))}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    keyPair,
    new TextEncoder().encode(token),
  );

  const jwt = `${token}.${bytesToBase64Url(new Uint8Array(signature))}`;

  return {
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
  };
}

function base64UrlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authSecret = base64UrlToBytes(auth);
  const p256dhBytes = base64UrlToBytes(p256dh);

  const ecdhKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  const publicKeyJwk = await crypto.subtle.exportKey("jwk", ecdhKeyPair.publicKey);
  const publicKeyRaw = new Uint8Array([
    ...base64UrlToBytes(publicKeyJwk.x!),
    ...base64UrlToBytes(publicKeyJwk.y!),
  ]);
  const serverPublicKey = new Uint8Array([4, ...publicKeyRaw]);

  const subscriberPublicKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: bytesToBase64Url(p256dhBytes.slice(0, 32)),
      y: bytesToBase64Url(p256dhBytes.slice(32)),
    },
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    ecdhKeyPair.privateKey,
    256,
  );

  const prk = await hmacSha256(authSecret, new Uint8Array(sharedSecret));
  const contentEncryptionKey = await hkdfExpand(prk, "aesgcm", salt);

  const nonce = await hmacSha256(contentEncryptionKey, new Uint8Array(0));
  const iv = nonce.slice(0, 12);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(payload);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    plaintext,
  );

  const encryptedContent = new Uint8Array(encrypted);

  const result = new Uint8Array(
    1 + 2 + serverPublicKey.length + salt.length + 4 + encryptedContent.length,
  );

  result[0] = 0x04;
  result[1] = 0x00;
  result[2] = 0x41;
  result.set(serverPublicKey, 3);
  result.set(salt, 3 + serverPublicKey.length);

  const view = new DataView(result.buffer);
  view.setUint32(3 + serverPublicKey.length + salt.length, encryptedContent.length);
  result.set(encryptedContent, 3 + serverPublicKey.length + salt.length + 4);

  return result;
}

async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(signature);
}

async function hkdfExpand(
  prk: Uint8Array,
  info: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HKDF" },
    false,
    ["deriveBits"],
  );

  const infoBytes = new TextEncoder().encode(info);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: infoBytes },
    cryptoKey,
    128,
  );

  return new Uint8Array(derivedBits);
}
