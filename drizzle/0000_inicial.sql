CREATE TYPE "public"."estado_boleta" AS ENUM('reservada', 'vendida');--> statement-breakpoint
CREATE TYPE "public"."estado_orden" AS ENUM('pendiente', 'aprobada', 'rechazada', 'vencida');--> statement-breakpoint
CREATE TYPE "public"."estado_retiro" AS ENUM('solicitado', 'pagado', 'rechazado');--> statement-breakpoint
CREATE TYPE "public"."estado_rifa" AS ENUM('borrador', 'activa', 'finalizada');--> statement-breakpoint
CREATE TYPE "public"."estado_sorteo" AS ENUM('programado', 'publicado');--> statement-breakpoint
CREATE TYPE "public"."plan_pago" AS ENUM('contado', 'cuotas');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('usuario', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tipo_orden" AS ENUM('compra', 'cuota');--> statement-breakpoint
CREATE TYPE "public"."tipo_premio" AS ENUM('diario', 'especial');--> statement-breakpoint
CREATE TABLE "abonos" (
	"id" serial PRIMARY KEY NOT NULL,
	"boleta_id" integer NOT NULL,
	"orden_id" integer NOT NULL,
	"mes" integer,
	"monto" integer NOT NULL,
	"fecha_solicitud" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ajustes" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"marca_nombre" text DEFAULT 'Suertazo' NOT NULL,
	"inicio_titulo" text NOT NULL,
	"inicio_texto" text NOT NULL,
	"anuncio" text,
	"whatsapp" text,
	"correo_contacto" text,
	"nombre_pasarela" text DEFAULT 'Wompi' NOT NULL,
	"instrucciones_pago" text,
	"comision_porcentaje" integer DEFAULT 20 NOT NULL,
	"niveles_comision" jsonb DEFAULT '[50,10,10,10,10]'::jsonb NOT NULL,
	"horas_reserva" integer DEFAULT 48 NOT NULL,
	"retiro_minimo" integer DEFAULT 50000 NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boletas" (
	"id" serial PRIMARY KEY NOT NULL,
	"rifa_id" integer NOT NULL,
	"numero" integer NOT NULL,
	"orden_id" integer NOT NULL,
	"usuario_id" integer,
	"estado" "estado_boleta" DEFAULT 'reservada' NOT NULL,
	"plan" "plan_pago" DEFAULT 'contado' NOT NULL,
	"precio" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comisiones" (
	"id" serial PRIMARY KEY NOT NULL,
	"beneficiario_id" integer NOT NULL,
	"orden_id" integer NOT NULL,
	"nivel" integer NOT NULL,
	"porcentaje_nivel" integer NOT NULL,
	"base_venta" integer NOT NULL,
	"monto" integer NOT NULL,
	"comprador_nombre" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loterias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"dia_juego" text,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"mensaje" text NOT NULL,
	"enlace" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ordenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"referencia" text NOT NULL,
	"rifa_id" integer NOT NULL,
	"usuario_id" integer,
	"nombre_contacto" text NOT NULL,
	"email_contacto" text NOT NULL,
	"telefono_contacto" text NOT NULL,
	"token_reclamo" text NOT NULL,
	"tipo" "tipo_orden" DEFAULT 'compra' NOT NULL,
	"plan" "plan_pago" DEFAULT 'contado' NOT NULL,
	"mes" integer,
	"detalle" jsonb,
	"referidor_id" integer,
	"numeros" jsonb NOT NULL,
	"cantidad" integer NOT NULL,
	"total" integer NOT NULL,
	"estado" "estado_orden" DEFAULT 'pendiente' NOT NULL,
	"nota_admin" text,
	"vence_en" timestamp with time zone NOT NULL,
	"revisado_en" timestamp with time zone,
	"revisado_por_id" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premios" (
	"id" serial PRIMARY KEY NOT NULL,
	"rifa_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"valor" integer DEFAULT 0 NOT NULL,
	"tipo" "tipo_premio" DEFAULT 'especial' NOT NULL,
	"dia_sorteo" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recordatorios" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"rifa_id" integer NOT NULL,
	"mes" integer NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retiros" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"monto" integer NOT NULL,
	"datos_pago" text NOT NULL,
	"estado" "estado_retiro" DEFAULT 'solicitado' NOT NULL,
	"nota" text,
	"procesado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rifas" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text NOT NULL,
	"imagen_url" text,
	"precio_boleta" integer NOT NULL,
	"cifras" integer DEFAULT 4 NOT NULL,
	"porcentaje_preventa" integer DEFAULT 30 NOT NULL,
	"meses_espera" integer DEFAULT 1 NOT NULL,
	"dias_sorteo" integer DEFAULT 365 NOT NULL,
	"premio_diario" integer DEFAULT 0 NOT NULL,
	"valor_cuota" integer DEFAULT 0 NOT NULL,
	"link_pago" text,
	"estado" "estado_rifa" DEFAULT 'borrador' NOT NULL,
	"fecha_umbral" timestamp with time zone,
	"fecha_inicio_sorteos" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sesiones" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sorteos" (
	"id" serial PRIMARY KEY NOT NULL,
	"rifa_id" integer NOT NULL,
	"premio_id" integer,
	"titulo" text NOT NULL,
	"valor_premio" integer DEFAULT 0 NOT NULL,
	"fecha" date NOT NULL,
	"numero_dia" integer,
	"loteria_id" integer,
	"numero_ganador" integer,
	"boleta_id" integer,
	"ganador_usuario_id" integer,
	"ganador_nombre" text,
	"boleta_sin_cuota" boolean DEFAULT false NOT NULL,
	"estado" "estado_sorteo" DEFAULT 'programado' NOT NULL,
	"pagado" boolean DEFAULT false NOT NULL,
	"pagado_en" timestamp with time zone,
	"publicado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suscripciones_push" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"telefono" text NOT NULL,
	"documento" text,
	"password_hash" text NOT NULL,
	"rol" "rol" DEFAULT 'usuario' NOT NULL,
	"codigo_referido" text NOT NULL,
	"referido_por_id" integer,
	"notificaciones_vistas_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_boleta_id_boletas_id_fk" FOREIGN KEY ("boleta_id") REFERENCES "public"."boletas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abonos" ADD CONSTRAINT "abonos_orden_id_ordenes_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_rifa_id_rifas_id_fk" FOREIGN KEY ("rifa_id") REFERENCES "public"."rifas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_orden_id_ordenes_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boletas" ADD CONSTRAINT "boletas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_beneficiario_id_usuarios_id_fk" FOREIGN KEY ("beneficiario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comisiones" ADD CONSTRAINT "comisiones_orden_id_ordenes_id_fk" FOREIGN KEY ("orden_id") REFERENCES "public"."ordenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_rifa_id_rifas_id_fk" FOREIGN KEY ("rifa_id") REFERENCES "public"."rifas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_referidor_id_usuarios_id_fk" FOREIGN KEY ("referidor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes" ADD CONSTRAINT "ordenes_revisado_por_id_usuarios_id_fk" FOREIGN KEY ("revisado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premios" ADD CONSTRAINT "premios_rifa_id_rifas_id_fk" FOREIGN KEY ("rifa_id") REFERENCES "public"."rifas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordatorios" ADD CONSTRAINT "recordatorios_rifa_id_rifas_id_fk" FOREIGN KEY ("rifa_id") REFERENCES "public"."rifas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retiros" ADD CONSTRAINT "retiros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_rifa_id_rifas_id_fk" FOREIGN KEY ("rifa_id") REFERENCES "public"."rifas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_premio_id_premios_id_fk" FOREIGN KEY ("premio_id") REFERENCES "public"."premios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_loteria_id_loterias_id_fk" FOREIGN KEY ("loteria_id") REFERENCES "public"."loterias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_boleta_id_boletas_id_fk" FOREIGN KEY ("boleta_id") REFERENCES "public"."boletas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sorteos" ADD CONSTRAINT "sorteos_ganador_usuario_id_usuarios_id_fk" FOREIGN KEY ("ganador_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suscripciones_push" ADD CONSTRAINT "suscripciones_push_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_referido_por_id_usuarios_id_fk" FOREIGN KEY ("referido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "abonos_boleta_idx" ON "abonos" USING btree ("boleta_id");--> statement-breakpoint
CREATE UNIQUE INDEX "abonos_boleta_mes_idx" ON "abonos" USING btree ("boleta_id","mes");--> statement-breakpoint
CREATE UNIQUE INDEX "boletas_rifa_numero_idx" ON "boletas" USING btree ("rifa_id","numero");--> statement-breakpoint
CREATE INDEX "boletas_usuario_idx" ON "boletas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "boletas_orden_idx" ON "boletas" USING btree ("orden_id");--> statement-breakpoint
CREATE INDEX "comisiones_beneficiario_idx" ON "comisiones" USING btree ("beneficiario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comisiones_orden_nivel_idx" ON "comisiones" USING btree ("orden_id","nivel");--> statement-breakpoint
CREATE UNIQUE INDEX "loterias_nombre_idx" ON "loterias" USING btree ("nombre");--> statement-breakpoint
CREATE INDEX "notificaciones_usuario_idx" ON "notificaciones" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "ordenes_referencia_idx" ON "ordenes" USING btree ("referencia");--> statement-breakpoint
CREATE INDEX "ordenes_estado_idx" ON "ordenes" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "ordenes_usuario_idx" ON "ordenes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "ordenes_email_idx" ON "ordenes" USING btree ("email_contacto");--> statement-breakpoint
CREATE INDEX "premios_rifa_idx" ON "premios" USING btree ("rifa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recordatorios_unicos_idx" ON "recordatorios" USING btree ("usuario_id","rifa_id","mes");--> statement-breakpoint
CREATE INDEX "retiros_usuario_idx" ON "retiros" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rifas_slug_idx" ON "rifas" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "sorteos_rifa_fecha_idx" ON "sorteos" USING btree ("rifa_id","fecha");--> statement-breakpoint
CREATE INDEX "sorteos_estado_idx" ON "sorteos" USING btree ("estado");--> statement-breakpoint
CREATE UNIQUE INDEX "suscripciones_endpoint_idx" ON "suscripciones_push" USING btree ("endpoint");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_codigo_idx" ON "usuarios" USING btree ("codigo_referido");--> statement-breakpoint
CREATE INDEX "usuarios_referido_por_idx" ON "usuarios" USING btree ("referido_por_id");