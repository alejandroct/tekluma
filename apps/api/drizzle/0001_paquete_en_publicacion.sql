ALTER TABLE "publicaciones_mazo" ALTER COLUMN "clave_s3" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "publicaciones_mazo" ADD COLUMN "paquete" jsonb NOT NULL;