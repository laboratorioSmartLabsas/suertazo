UPDATE "usuarios" u
SET "referido_por_id" = o."referidor_id"
FROM (
  SELECT DISTINCT ON ("usuario_id") "usuario_id", "referidor_id"
  FROM "ordenes"
  WHERE "usuario_id" IS NOT NULL AND "referidor_id" IS NOT NULL AND "estado" = 'aprobada'
  ORDER BY "usuario_id", "creado_en" ASC
) o
WHERE u."id" = o."usuario_id"
  AND u."referido_por_id" IS NULL
  AND o."referidor_id" <> u."id"
  AND NOT EXISTS (
    SELECT 1 FROM "usuarios" p WHERE p."id" = o."referidor_id" AND p."referido_por_id" = u."id"
  );
