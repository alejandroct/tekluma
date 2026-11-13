CREATE TABLE "live_answers" (
	"player_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"question_index" integer NOT NULL,
	"option" integer NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_answers_player_id_question_index_pk" PRIMARY KEY("player_id","question_index")
);
--> statement-breakpoint
CREATE TABLE "live_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"host_id" uuid NOT NULL,
	"host_key" text NOT NULL,
	"standard_code" text NOT NULL,
	"card_ids" jsonb NOT NULL,
	"question_seconds" integer NOT NULL,
	"phase" text DEFAULT 'sala' NOT NULL,
	"question_index" integer DEFAULT -1 NOT NULL,
	"question_started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_games_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "live_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_players_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "live_answers" ADD CONSTRAINT "live_answers_player_id_live_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."live_players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_answers" ADD CONSTRAINT "live_answers_game_id_live_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."live_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_games" ADD CONSTRAINT "live_games_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_players" ADD CONSTRAINT "live_players_game_id_live_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."live_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_answers_game_idx" ON "live_answers" USING btree ("game_id","question_index");--> statement-breakpoint
CREATE INDEX "live_players_game_idx" ON "live_players" USING btree ("game_id","score");