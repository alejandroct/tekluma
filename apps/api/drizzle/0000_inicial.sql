CREATE TYPE "public"."acceso_mazo" AS ENUM('gratis', 'monedas', 'premium');--> statement-breakpoint
CREATE TYPE "public"."disciplina" AS ENUM('habilitaciones_urbanas', 'arquitectura', 'estructuras', 'instalaciones_sanitarias', 'instalaciones_electromecanicas', 'generales');--> statement-breakpoint
CREATE TYPE "public"."estado_editorial" AS ENUM('borrador', 'en_revision', 'aprobado', 'publicado', 'obsoleto');--> statement-breakpoint
CREATE TYPE "public"."motivo_monedas" AS ENUM('anuncio', 'compra', 'desbloqueo', 'bono', 'ajuste');--> statement-breakpoint
CREATE TYPE "public"."rol_staff" AS ENUM('autor', 'revisor', 'admin');--> statement-breakpoint
CREATE TABLE "articulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_norma_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"encabezado" text,
	"texto" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citas_tarjeta" (
	"tarjeta_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"extracto" text NOT NULL,
	CONSTRAINT "citas_tarjeta_tarjeta_id_articulo_id_pk" PRIMARY KEY("tarjeta_id","articulo_id")
);
--> statement-breakpoint
CREATE TABLE "desbloqueos_mazo" (
	"usuario_id" uuid NOT NULL,
	"mazo_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "desbloqueos_mazo_usuario_id_mazo_id_pk" PRIMARY KEY("usuario_id","mazo_id")
);
--> statement-breakpoint
CREATE TABLE "estados_repaso" (
	"usuario_id" uuid NOT NULL,
	"tarjeta_id" uuid NOT NULL,
	"vence" timestamp with time zone NOT NULL,
	"estabilidad" real NOT NULL,
	"dificultad" real NOT NULL,
	"repeticiones" integer NOT NULL,
	"fallos" integer NOT NULL,
	"estado" smallint NOT NULL,
	"ultimo_repaso" timestamp with time zone,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estados_repaso_usuario_id_tarjeta_id_pk" PRIMARY KEY("usuario_id","tarjeta_id")
);
--> statement-breakpoint
CREATE TABLE "mazos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"norma_id" uuid NOT NULL,
	"acceso" "acceso_mazo" DEFAULT 'premium' NOT NULL,
	"precio_monedas" integer,
	"orden" integer DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mazos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "movimientos_monedas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"cantidad" integer NOT NULL,
	"motivo" "motivo_monedas" NOT NULL,
	"referencia" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "normas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"titulo" text NOT NULL,
	"disciplina" "disciplina" NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "normas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "publicaciones_mazo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mazo_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"clave_s3" text NOT NULL,
	"total_tarjetas" integer NOT NULL,
	"publicado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisiones_editoriales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarjeta_id" uuid NOT NULL,
	"revisor_id" uuid NOT NULL,
	"aprobada" boolean NOT NULL,
	"comentario" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarjetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mazo_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"contenido" jsonb NOT NULL,
	"estado" "estado_editorial" DEFAULT 'borrador' NOT NULL,
	"autor_id" uuid NOT NULL,
	"revisor_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nombre" text,
	"profesion" text,
	"rol_staff" "rol_staff",
	"premium_hasta" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "versiones_norma" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"norma_id" uuid NOT NULL,
	"dispositivo" text NOT NULL,
	"publicada_en" timestamp with time zone NOT NULL,
	"vigente" boolean DEFAULT false NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articulos" ADD CONSTRAINT "articulos_version_norma_id_versiones_norma_id_fk" FOREIGN KEY ("version_norma_id") REFERENCES "public"."versiones_norma"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas_tarjeta" ADD CONSTRAINT "citas_tarjeta_tarjeta_id_tarjetas_id_fk" FOREIGN KEY ("tarjeta_id") REFERENCES "public"."tarjetas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas_tarjeta" ADD CONSTRAINT "citas_tarjeta_articulo_id_articulos_id_fk" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desbloqueos_mazo" ADD CONSTRAINT "desbloqueos_mazo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "desbloqueos_mazo" ADD CONSTRAINT "desbloqueos_mazo_mazo_id_mazos_id_fk" FOREIGN KEY ("mazo_id") REFERENCES "public"."mazos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estados_repaso" ADD CONSTRAINT "estados_repaso_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estados_repaso" ADD CONSTRAINT "estados_repaso_tarjeta_id_tarjetas_id_fk" FOREIGN KEY ("tarjeta_id") REFERENCES "public"."tarjetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mazos" ADD CONSTRAINT "mazos_norma_id_normas_id_fk" FOREIGN KEY ("norma_id") REFERENCES "public"."normas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_monedas" ADD CONSTRAINT "movimientos_monedas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicaciones_mazo" ADD CONSTRAINT "publicaciones_mazo_mazo_id_mazos_id_fk" FOREIGN KEY ("mazo_id") REFERENCES "public"."mazos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publicaciones_mazo" ADD CONSTRAINT "publicaciones_mazo_publicado_por_usuarios_id_fk" FOREIGN KEY ("publicado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_editoriales" ADD CONSTRAINT "revisiones_editoriales_tarjeta_id_tarjetas_id_fk" FOREIGN KEY ("tarjeta_id") REFERENCES "public"."tarjetas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisiones_editoriales" ADD CONSTRAINT "revisiones_editoriales_revisor_id_usuarios_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_mazo_id_mazos_id_fk" FOREIGN KEY ("mazo_id") REFERENCES "public"."mazos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_revisor_id_usuarios_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versiones_norma" ADD CONSTRAINT "versiones_norma_norma_id_normas_id_fk" FOREIGN KEY ("norma_id") REFERENCES "public"."normas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articulos_version_numero_uq" ON "articulos" USING btree ("version_norma_id","numero");--> statement-breakpoint
CREATE INDEX "citas_articulo_idx" ON "citas_tarjeta" USING btree ("articulo_id");--> statement-breakpoint
CREATE INDEX "estados_vence_idx" ON "estados_repaso" USING btree ("usuario_id","vence");--> statement-breakpoint
CREATE INDEX "movimientos_usuario_idx" ON "movimientos_monedas" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_motivo_ref_uq" ON "movimientos_monedas" USING btree ("motivo","referencia");--> statement-breakpoint
CREATE UNIQUE INDEX "publicaciones_mazo_version_uq" ON "publicaciones_mazo" USING btree ("mazo_id","version");--> statement-breakpoint
CREATE INDEX "tarjetas_mazo_estado_idx" ON "tarjetas" USING btree ("mazo_id","estado");--> statement-breakpoint
CREATE INDEX "versiones_norma_norma_idx" ON "versiones_norma" USING btree ("norma_id");