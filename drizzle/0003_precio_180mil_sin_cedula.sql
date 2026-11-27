ALTER TABLE "usuarios" DROP COLUMN "documento";--> statement-breakpoint
UPDATE "rifas"
SET "precio_boleta" = 180000,
    "descripcion" = replace("descripcion", '$150.000', '$180.000')
WHERE "slug" = 'gran-rifa-suertazo' AND "precio_boleta" = 150000;
