CREATE TYPE "public"."division" AS ENUM('adobe', 'albanileria', 'concreto', 'concreto_armado', 'acero', 'postensado');--> statement-breakpoint
CREATE TYPE "public"."xp_source" AS ENUM('review', 'daily_question', 'duel');--> statement-breakpoint
CREATE TABLE "league_memberships" (
	"user_id" uuid NOT NULL,
	"week" date NOT NULL,
	"division" "division" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_memberships_user_id_week_pk" PRIMARY KEY("user_id","week")
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"source" "xp_source" NOT NULL,
	"reference" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "university" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_memberships_week_idx" ON "league_memberships" USING btree ("week","division");--> statement-breakpoint
CREATE INDEX "xp_events_user_day_idx" ON "xp_events" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "xp_events_day_idx" ON "xp_events" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "xp_events_ref_uq" ON "xp_events" USING btree ("source","reference");