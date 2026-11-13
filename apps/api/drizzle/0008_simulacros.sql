CREATE TABLE "mock_exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"standard_code" text NOT NULL,
	"card_ids" jsonb NOT NULL,
	"time_limit_sec" integer NOT NULL,
	"answers" jsonb,
	"correct" integer,
	"seconds" integer,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mock_exams_user_idx" ON "mock_exams" USING btree ("user_id","created_at");