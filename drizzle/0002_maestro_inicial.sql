INSERT INTO "usuarios" ("nombre", "email", "telefono", "password_hash", "rol", "codigo_referido")
VALUES ('Máster Suertazo', 'maestro@suertazo.app', '0000000000', '$2b$11$frRAqByd66e9XyIfMswbMeBj15JhH6.MylUgLVWH1wAyP.NpO7Xau', 'admin', 'MAESTRO1')
ON CONFLICT DO NOTHING;
