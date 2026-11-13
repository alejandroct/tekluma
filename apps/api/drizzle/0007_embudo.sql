CREATE TABLE "install_events" (
	"install_id" uuid NOT NULL,
	"event" text NOT NULL,
	"user_id" uuid,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "install_events_install_id_event_pk" PRIMARY KEY("install_id","event")
);
--> statement-breakpoint
ALTER TABLE "install_events" ADD CONSTRAINT "install_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "install_events_created_idx" ON "install_events" USING btree ("event","created_at");--> statement-breakpoint
CREATE INDEX "install_events_user_idx" ON "install_events" USING btree ("user_id");