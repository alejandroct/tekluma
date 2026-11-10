CREATE TABLE "duel_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"answers" jsonb NOT NULL,
	"correct" integer NOT NULL,
	"seconds" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"standard_code" text NOT NULL,
	"card_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "duels_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "duel_plays" ADD CONSTRAINT "duel_plays_duel_id_duels_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_plays" ADD CONSTRAINT "duel_plays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "duel_plays_duel_idx" ON "duel_plays" USING btree ("duel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "duel_plays_user_uq" ON "duel_plays" USING btree ("duel_id","user_id");