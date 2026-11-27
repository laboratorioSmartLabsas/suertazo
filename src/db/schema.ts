import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const rolEnum = pgEnum("rol", ["usuario", "admin"]);
export const estadoRifaEnum = pgEnum("estado_rifa", ["borrador", "activa", "finalizada"]);
export const estadoOrdenEnum = pgEnum("estado_orden", ["pendiente", "aprobada", "rechazada", "vencida"]);
export const estadoBoletaEnum = pgEnum("estado_boleta", ["reservada", "vendida"]);
export const estadoSorteoEnum = pgEnum("estado_sorteo", ["programado", "publicado"]);
export const estadoRetiroEnum = pgEnum("estado_retiro", ["solicitado", "pagado", "rechazado"]);
export const tipoPremioEnum = pgEnum("tipo_premio", ["diario", "especial"]);
export const tipoOrdenEnum = pgEnum("tipo_orden", ["compra", "cuota"]);
export const planPagoEnum = pgEnum("plan_pago", ["contado", "cuotas"]);

const creadoEn = () => timestamp("creado_en", { withTimezone: true }).notNull().defaultNow();

export const usuarios = pgTable(
  "usuarios",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    email: text("email").notNull(),
    telefono: text("telefono").notNull(),
    passwordHash: text("password_hash").notNull(),
    rol: rolEnum("rol").notNull().default("usuario"),
    codigoReferido: text("codigo_referido").notNull(),
    referidoPorId: integer("referido_por_id").references((): AnyPgColumn => usuarios.id, {
      onDelete: "set null",
    }),
    notificacionesVistasEn: timestamp("notificaciones_vistas_en", { withTimezone: true }),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex("usuarios_email_idx").on(t.email),
    uniqueIndex("usuarios_codigo_idx").on(t.codigoReferido),
    index("usuarios_referido_por_idx").on(t.referidoPorId),
  ],
);

export const sesiones = pgTable("sesiones", {
  id: text("id").primaryKey(),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  expiraEn: timestamp("expira_en", { withTimezone: true }).notNull(),
  creadoEn: creadoEn(),
});

export const ajustes = pgTable("ajustes", {
  id: integer("id").primaryKey().default(1),
  marcaNombre: text("marca_nombre").notNull().default("Suertazo"),
  inicioTitulo: text("inicio_titulo").notNull(),
  inicioTexto: text("inicio_texto").notNull(),
  anuncio: text("anuncio"),
  whatsapp: text("whatsapp"),
  correoContacto: text("correo_contacto"),
  nombrePasarela: text("nombre_pasarela").notNull().default("Wompi"),
  instruccionesPago: text("instrucciones_pago"),
  comisionPorcentaje: integer("comision_porcentaje").notNull().default(20),
  nivelesComision: jsonb("niveles_comision").$type<number[]>().notNull().default([50, 10, 10, 10, 20]),
  horasReserva: integer("horas_reserva").notNull().default(48),
  retiroMinimo: integer("retiro_minimo").notNull().default(50000),
  actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
});

export const loterias = pgTable(
  "loterias",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    diaJuego: text("dia_juego"),
    activa: boolean("activa").notNull().default(true),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("loterias_nombre_idx").on(t.nombre)],
);

export const rifas = pgTable(
  "rifas",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion").notNull(),
    imagenUrl: text("imagen_url"),
    precioBoleta: integer("precio_boleta").notNull(),
    cifras: integer("cifras").notNull().default(4),
    porcentajePreventa: integer("porcentaje_preventa").notNull().default(30),
    mesesEspera: integer("meses_espera").notNull().default(1),
    diasSorteo: integer("dias_sorteo").notNull().default(365),
    premioDiario: integer("premio_diario").notNull().default(0),
    valorCuota: integer("valor_cuota").notNull().default(0),
    linkPago: text("link_pago"),
    linkPagoCuotas: text("link_pago_cuotas"),
    estado: estadoRifaEnum("estado").notNull().default("borrador"),
    fechaUmbral: timestamp("fecha_umbral", { withTimezone: true }),
    fechaInicioSorteos: date("fecha_inicio_sorteos", { mode: "string" }),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("rifas_slug_idx").on(t.slug)],
);

export const premios = pgTable(
  "premios",
  {
    id: serial("id").primaryKey(),
    rifaId: integer("rifa_id")
      .notNull()
      .references(() => rifas.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion"),
    valor: integer("valor").notNull().default(0),
    tipo: tipoPremioEnum("tipo").notNull().default("especial"),
    diaSorteo: integer("dia_sorteo"),
    orden: integer("orden").notNull().default(0),
    creadoEn: creadoEn(),
  },
  (t) => [index("premios_rifa_idx").on(t.rifaId)],
);

export const ordenes = pgTable(
  "ordenes",
  {
    id: serial("id").primaryKey(),
    referencia: text("referencia").notNull(),
    rifaId: integer("rifa_id")
      .notNull()
      .references(() => rifas.id, { onDelete: "restrict" }),
    usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
    nombreContacto: text("nombre_contacto").notNull(),
    emailContacto: text("email_contacto").notNull(),
    telefonoContacto: text("telefono_contacto").notNull(),
    tokenReclamo: text("token_reclamo").notNull(),
    tipo: tipoOrdenEnum("tipo").notNull().default("compra"),
    plan: planPagoEnum("plan").notNull().default("contado"),
    mes: integer("mes"),
    detalle: jsonb("detalle").$type<{ boletaId: number; numero: number; mes: number }[]>(),
    referidorId: integer("referidor_id").references(() => usuarios.id, { onDelete: "set null" }),
    numeros: jsonb("numeros").$type<number[]>().notNull(),
    cantidad: integer("cantidad").notNull(),
    total: integer("total").notNull(),
    estado: estadoOrdenEnum("estado").notNull().default("pendiente"),
    notaAdmin: text("nota_admin"),
    venceEn: timestamp("vence_en", { withTimezone: true }).notNull(),
    revisadoEn: timestamp("revisado_en", { withTimezone: true }),
    revisadoPorId: integer("revisado_por_id").references(() => usuarios.id, { onDelete: "set null" }),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex("ordenes_referencia_idx").on(t.referencia),
    index("ordenes_estado_idx").on(t.estado),
    index("ordenes_usuario_idx").on(t.usuarioId),
    index("ordenes_email_idx").on(t.emailContacto),
  ],
);

export const boletas = pgTable(
  "boletas",
  {
    id: serial("id").primaryKey(),
    rifaId: integer("rifa_id")
      .notNull()
      .references(() => rifas.id, { onDelete: "cascade" }),
    numero: integer("numero").notNull(),
    ordenId: integer("orden_id")
      .notNull()
      .references(() => ordenes.id, { onDelete: "cascade" }),
    usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
    estado: estadoBoletaEnum("estado").notNull().default("reservada"),
    plan: planPagoEnum("plan").notNull().default("contado"),
    precio: integer("precio").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [
    uniqueIndex("boletas_rifa_numero_idx").on(t.rifaId, t.numero),
    index("boletas_usuario_idx").on(t.usuarioId),
    index("boletas_orden_idx").on(t.ordenId),
  ],
);

export const sorteos = pgTable(
  "sorteos",
  {
    id: serial("id").primaryKey(),
    rifaId: integer("rifa_id")
      .notNull()
      .references(() => rifas.id, { onDelete: "cascade" }),
    premioId: integer("premio_id").references(() => premios.id, { onDelete: "set null" }),
    titulo: text("titulo").notNull(),
    valorPremio: integer("valor_premio").notNull().default(0),
    fecha: date("fecha", { mode: "string" }).notNull(),
    numeroDia: integer("numero_dia"),
    loteriaId: integer("loteria_id").references(() => loterias.id, { onDelete: "set null" }),
    numeroGanador: integer("numero_ganador"),
    boletaId: integer("boleta_id").references(() => boletas.id, { onDelete: "set null" }),
    ganadorUsuarioId: integer("ganador_usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
    ganadorNombre: text("ganador_nombre"),
    boletaSinCuota: boolean("boleta_sin_cuota").notNull().default(false),
    estado: estadoSorteoEnum("estado").notNull().default("programado"),
    pagado: boolean("pagado").notNull().default(false),
    pagadoEn: timestamp("pagado_en", { withTimezone: true }),
    publicadoEn: timestamp("publicado_en", { withTimezone: true }),
    creadoEn: creadoEn(),
  },
  (t) => [
    index("sorteos_rifa_fecha_idx").on(t.rifaId, t.fecha),
    index("sorteos_estado_idx").on(t.estado),
  ],
);

export const abonos = pgTable(
  "abonos",
  {
    id: serial("id").primaryKey(),
    boletaId: integer("boleta_id")
      .notNull()
      .references(() => boletas.id, { onDelete: "cascade" }),
    ordenId: integer("orden_id")
      .notNull()
      .references(() => ordenes.id, { onDelete: "cascade" }),
    mes: integer("mes"),
    monto: integer("monto").notNull(),
    fechaSolicitud: date("fecha_solicitud", { mode: "string" }).notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [index("abonos_boleta_idx").on(t.boletaId), uniqueIndex("abonos_boleta_mes_idx").on(t.boletaId, t.mes)],
);

export const recordatorios = pgTable(
  "recordatorios",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    rifaId: integer("rifa_id")
      .notNull()
      .references(() => rifas.id, { onDelete: "cascade" }),
    mes: integer("mes").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("recordatorios_unicos_idx").on(t.usuarioId, t.rifaId, t.mes)],
);

export const notificaciones = pgTable(
  "notificaciones",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    mensaje: text("mensaje").notNull(),
    enlace: text("enlace"),
    creadoEn: creadoEn(),
  },
  (t) => [index("notificaciones_usuario_idx").on(t.usuarioId, t.creadoEn)],
);

export const comisiones = pgTable(
  "comisiones",
  {
    id: serial("id").primaryKey(),
    beneficiarioId: integer("beneficiario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    ordenId: integer("orden_id")
      .notNull()
      .references(() => ordenes.id, { onDelete: "cascade" }),
    nivel: integer("nivel").notNull(),
    porcentajeNivel: integer("porcentaje_nivel").notNull(),
    baseVenta: integer("base_venta").notNull(),
    monto: integer("monto").notNull(),
    compradorNombre: text("comprador_nombre").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [
    index("comisiones_beneficiario_idx").on(t.beneficiarioId),
    uniqueIndex("comisiones_orden_nivel_idx").on(t.ordenId, t.nivel),
  ],
);

export const retiros = pgTable(
  "retiros",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    monto: integer("monto").notNull(),
    datosPago: text("datos_pago").notNull(),
    estado: estadoRetiroEnum("estado").notNull().default("solicitado"),
    nota: text("nota"),
    procesadoEn: timestamp("procesado_en", { withTimezone: true }),
    creadoEn: creadoEn(),
  },
  (t) => [index("retiros_usuario_idx").on(t.usuarioId)],
);

export const suscripcionesPush = pgTable(
  "suscripciones_push",
  {
    id: serial("id").primaryKey(),
    usuarioId: integer("usuario_id").references(() => usuarios.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("suscripciones_endpoint_idx").on(t.endpoint)],
);

export type Usuario = typeof usuarios.$inferSelect;
export type Rifa = typeof rifas.$inferSelect;
export type Premio = typeof premios.$inferSelect;
export type Orden = typeof ordenes.$inferSelect;
export type Sorteo = typeof sorteos.$inferSelect;
export type Boleta = typeof boletas.$inferSelect;
export type Abono = typeof abonos.$inferSelect;
export type Ajustes = typeof ajustes.$inferSelect;
