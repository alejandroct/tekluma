CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"is_minor" boolean DEFAULT false NOT NULL,
	"guardian" text,
	"item_type" text NOT NULL,
	"item_description" text NOT NULL,
	"amount_cents" integer,
	"detail" text NOT NULL,
	"request" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"receipt_sent_at" timestamp with time zone,
	"response" text,
	"responded_at" timestamp with time zone,
	"responded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaints_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaints_created_idx" ON "complaints" USING btree ("created_at");