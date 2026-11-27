# Suertazo

Suertazo es una plataforma de rifas instalable como app (PWA). Las personas compran boletas de contado o en cuotas mensuales, siguen los sorteos diarios que se juegan con las loterías de Colombia y ganan comisiones con su red de referidos. El máster (administrador) aprueba los pagos, programa los sorteos, publica los resultados y paga premios y comisiones.

## Cómo funciona

**Sesión pública**
- Inicio con el logo, la información que escribe el máster, las rifas activas, los últimos premios y el botón *Ingresar / Registrarse*.
- Cualquier persona puede escoger números y pagar sin registrarse. Sus números quedan reservados y luego se registra para asentar la compra en su perfil.

**Pagos (link de Wompi)**
1. Al confirmar la compra se crea una solicitud de aprobación con una referencia `SZ-XXXXXX`, y la persona abre el link de pago.
2. El máster revisa el banco y aprueba la solicitud en *Panel → Ventas*.
3. La boleta queda anclada al perfil, se generan las comisiones y llega una notificación.

Los números se reservan durante las horas que se configuren (48 por defecto). Si una reserva vence, el máster todavía puede aprobarla siempre que los números sigan libres.

**Plan de cuotas**
- Precio de la boleta: $180.000, de contado o en 12 cuotas mensuales de $15.000.
- Cada cuota habilita la boleta para los sorteos de ese mes. Un mes sin cuota no juega.
- Al completar los $180.000, la boleta juega todos los meses que falten.
- Solo cuentan los pagos solicitados antes o el mismo día del sorteo. Si un número ganador tiene la cuota de ese mes en revisión, el sistema no deja publicar el resultado hasta que el máster apruebe o rechace ese pago.

**Fases de la rifa**
1. *Preventa*: dura hasta vender el 30% de la boletería (configurable).
2. *Cuenta regresiva*: el día que se alcanza la meta, el sistema fija el inicio de los sorteos para un mes después. Ese mismo día crea los 365 sorteos diarios y los sorteos especiales: la NMAX el día 180 y el lote en Guatapé el día 365.
3. *Sorteos*: cada día el máster asigna la lotería y publica el número ganador. Los resultados aparecen en *Últimos premios* y llegan como notificación a visitantes y a usuarios registrados, incluida la notificación push si está configurada.

**Referidos y billetera**
- Cada usuario tiene un link `/r/CODIGO` que lleva al inicio y deja el rastro de quien lo invitó.
- La bolsa de comisión es el 20% de cada pago aprobado. Se reparte en líneas: 50% para la primera línea, 10% para cada una de las líneas 2, 3 y 4, y 20% para la quinta, que suman el 100% de la bolsa. Los porcentajes se configuran en *Panel → Ajustes*.
- La billetera muestra lo ganado por línea, los retiros y el saldo disponible. El máster paga los retiros en *Panel → Comisiones*.

## Correr en local

Requisitos: Node 20.9 o superior y PostgreSQL 14 o superior.

```bash
cp .env.example .env        # ajusta DATABASE_URL y los datos del máster
npm install
npm run db:setup            # migraciones + datos iniciales (loterías, rifa, máster)
npm run dev                 # http://localhost:4817
```

Ingresa con `ADMIN_EMAIL` / `ADMIN_PASSWORD` para abrir el panel en `/admin`.

| Script | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 4817 |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm run db:generate` | Genera una migración nueva después de cambiar `src/db/schema.ts` |
| `npm run db:setup` | Aplica las migraciones y crea los datos iniciales. Se puede ejecutar varias veces sin duplicar nada |
| `npm run lint` / `npm run typecheck` | Revisiones de código |

## Publicar en Railway (desde GitHub)

1. Sube este repositorio a GitHub.
2. En Railway crea un proyecto con **Deploy from GitHub repo** y selecciona el repositorio.
3. Agrega una base de datos **PostgreSQL** al proyecto.
4. En las variables del servicio web define lo siguiente:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia a la base de datos) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, `ADMIN_TELEFONO` | Datos del máster que se crea en el primer arranque |
| `APP_URL` | Opcional. Dominio público, por ejemplo `https://suertazo.up.railway.app`. Si no existe se usa el dominio que Railway inyecta; los valores con `localhost` se ignoran |
| `WOMPI_LINK_PAGO` | Opcional. Link de Wompi de contado ($180.000) de la primera rifa (por defecto el de Nequi/Wompi ya configurado; se edita desde el panel) |
| `WOMPI_LINK_CUOTAS` | Opcional. Link de Wompi de cuota ($15.000) de la primera rifa |
| `CRON_SECRET` | Clave larga aleatoria |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Opcional, para notificaciones push. Se generan con `npx web-push generate-vapid-keys` |

5. En **Settings → Networking**, genera un dominio. Los links de referido usarán ese dominio automáticamente (puedes fijarlo con `APP_URL`).
6. `railway.json` ya define la compilación y el arranque. En cada despliegue, `npm run start:railway` aplica las migraciones y el seed antes de iniciar el servidor.
7. Opcional: crea un servicio *Cron* en Railway que corra cada hora y ejecute:

   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/tareas"
   ```

   Esta tarea vence las reservas sin pagar y envía los recordatorios de cuota. El panel del máster también la ejecuta cada vez que se abre.

Cada `push` a `main` despliega automáticamente en Railway. El workflow `.github/workflows/ci.yml` corre lint, typecheck, migraciones y build en GitHub Actions.

## Estructura

- `src/app/(sitio)`: sitio público y cuenta del usuario (boletas, billetera, referidos, notificaciones, perfil).
- `src/app/admin`: panel del máster (ventas, rifas, sorteos, premios, comisiones, usuarios, loterías, ajustes).
- `src/app/acciones`: Server Actions (compras, autenticación, cuenta, administración).
- `src/lib`: reglas del negocio (`rifas.ts`, `cuotas.ts`), sesiones, notificaciones y consultas.
- `src/db/schema.ts`: modelo de datos (Drizzle ORM). Las migraciones están en `drizzle/`.
- `public/sw.js`: service worker (instalación, página sin conexión y push).

> Las rifas en Colombia requieren autorización de Coljuegos o de la autoridad territorial correspondiente. Revisa los requisitos legales antes de vender boletas.
