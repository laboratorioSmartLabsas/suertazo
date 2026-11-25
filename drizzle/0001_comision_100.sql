ALTER TABLE "ajustes" ALTER COLUMN "niveles_comision" SET DEFAULT '[50,10,10,10,20]'::jsonb;
--> statement-breakpoint
UPDATE "ajustes" SET "niveles_comision" = '[50,10,10,10,20]'::jsonb WHERE "niveles_comision" = '[50,10,10,10,10]'::jsonb;
