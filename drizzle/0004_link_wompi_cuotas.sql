ALTER TABLE "rifas" ADD COLUMN "link_pago_cuotas" text;
--> statement-breakpoint
UPDATE "rifas"
SET "link_pago" = CASE WHEN coalesce("link_pago", '') = '' THEN 'https://checkout.nequi.wompi.co/l/23xptl' ELSE "link_pago" END,
    "link_pago_cuotas" = CASE WHEN coalesce("link_pago_cuotas", '') = '' THEN 'https://checkout.nequi.wompi.co/l/4IrUpw' ELSE "link_pago_cuotas" END
WHERE "slug" = 'gran-rifa-suertazo';
