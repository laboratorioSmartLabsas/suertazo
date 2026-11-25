const VERSION = "suertazo-v2";
const OFFLINE = "/sin-conexion";
const PRECACHE = [OFFLINE, "/escudo.webp", "/logo-suertazo.webp", "/icon-192.png", "/icon-512.png", "/favicon-48.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

function esEstatico(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|webp|jpg|jpeg|svg|ico|woff2?)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (esEstatico(url)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const guardada = await cache.match(request);
        if (guardada) return guardada;
        const respuesta = await fetch(request);
        if (respuesta.ok) cache.put(request, respuesta.clone());
        return respuesta;
      }),
    );
    return;
  }

  // Las páginas muestran datos personales: nunca se guardan en caché, solo se ofrece la página sin conexión.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE).then((r) => r ?? Response.error())));
  }
});

self.addEventListener("push", (event) => {
  let datos = { titulo: "Suertazo", mensaje: "Tienes una nueva notificación.", enlace: "/" };
  try {
    datos = { ...datos, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.mensaje,
      icon: "/icon-192.png",
      badge: "/favicon-48.png",
      data: { enlace: datos.enlace },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const enlace = event.notification.data?.enlace ?? "/";
  const destino = new URL(enlace.startsWith("/") ? enlace : "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url === destino && "focus" in v) return v.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
