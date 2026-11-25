# Suertudo

Suertudo es una PWA (aplicación web progresiva) de consulta diaria de buena fortuna. Cada día puedes hacer una consulta que te da un puntaje de la suerte, un número, un color y un mensaje. Las consultas anteriores quedan guardadas en el navegador.

## Características

- Una consulta por día con puntaje, número y color de la suerte.
- Historial de los últimos 30 días guardado localmente (sin cuentas ni servidor).
- Instalable en el dispositivo y con soporte sin conexión gracias al service worker.
- Diseño responsive, con soporte para modo oscuro.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 y shadcn/ui
- Service worker propio en `public/sw.js` y manifest en `src/app/manifest.ts`

## Desarrollo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev      # desarrollo
npm run build    # compilación de producción
npm start -- -p 4817   # servir la compilación en el puerto 4817
npm run lint
```

Abre `http://localhost:4817` (o el puerto que elijas). El service worker solo se activa en una compilación servida con `npm start`, por lo que la funcionalidad sin conexión y la instalación se prueban con el build de producción.

## Estructura

- `src/lib/suerte.ts`: lógica del sorteo, niveles y mensajes.
- `src/lib/historial.ts`: persistencia en `localStorage` y hook de lectura.
- `src/components/suertudo.tsx`: pantalla principal.
- `src/components/instalar-app.tsx`: botón de instalación (`beforeinstallprompt`).
- `public/`: iconos, `sw.js` y favicon.
