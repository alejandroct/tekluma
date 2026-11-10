ALTER TYPE "public"."coin_reason" ADD VALUE 'daily_question' BEFORE 'check_in';--> statement-breakpoint
CREATE TABLE "daily_answers" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"guesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"solved" boolean DEFAULT false NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "daily_answers_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "daily_questions" (
	"day" date PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"card_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_questions_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "daily_answers" ADD CONSTRAINT "daily_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_questions" ADD CONSTRAINT "daily_questions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;