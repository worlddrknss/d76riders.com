/* District 76 service worker — push only.
 *
 * Deliberately has NO fetch handler, so it never intercepts navigations or caches
 * pages. Its only job is to receive web-push messages and open the right page on
 * click. Keeping it push-only means it can't break the live site. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "District 76", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "District 76";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const client of wins) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    }),
  );
});

const OFFLINE_URL = "/offline";
const OFFLINE_CACHE = "d76-offline-v1";

// Pre-cache the offline fallback page so it's available with no connection.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-FIRST for page navigations only: always try the network, and fall back
// to the cached offline page solely when the fetch fails. Never serves stale
// content, and non-navigation requests are left entirely to the browser.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((cached) => cached || new Response("Offline", { status: 503 })),
    ),
  );
});
