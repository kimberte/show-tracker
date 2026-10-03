import webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:notifications@mytvtracker.app";

export function pushConfigured() {
  return Boolean(publicKey && privateKey);
}

export function vapidPublicKey() {
  return publicKey || "";
}

export function configureWebPush() {
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  if (!configureWebPush()) throw new Error("Web push is not configured.");
  return webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify(payload)
  );
}
