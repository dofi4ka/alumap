CREATE TABLE "followed_cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"actor_nano_id" text,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"city_name" text NOT NULL,
	"city_lat" double precision NOT NULL,
	"city_lng" double precision NOT NULL,
	"near_city_name" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_copies" (
	"referral_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_copies_referral_id_user_id_pk" PRIMARY KEY("referral_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"purpose" text NOT NULL,
	"email" text NOT NULL,
	"graduation_year" integer,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sso_email" text;--> statement-breakpoint
--> Existing users registered with their Innopolis address as the main email.
--> The main email stays as is; the same address is also marked as a verified SSO email.
UPDATE "users" SET "sso_email" = lower("email")
WHERE lower("email") LIKE '%@innopolis.university' OR lower("email") LIKE '%@innopolis.ru';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temporary_location_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temporary_location_lat" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temporary_location_lng" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temporary_location_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "followed_cities" ADD CONSTRAINT "followed_cities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_copies" ADD CONSTRAINT "referral_copies_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_copies" ADD CONSTRAINT "referral_copies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_codes" ADD CONSTRAINT "user_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "followed_cities_user_idx" ON "followed_cities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "followed_cities_user_city_idx" ON "followed_cities" USING btree ("user_id","lat","lng");--> statement-breakpoint
--> Everyone follows their current city by default.
INSERT INTO "followed_cities" ("user_id", "name", "lat", "lng", "source", "enabled")
SELECT "id", "location_name", "location_lat", "location_lng", 'location', true
FROM "users"
WHERE "location_name" IS NOT NULL AND "location_lat" IS NOT NULL AND "location_lng" IS NOT NULL
ON CONFLICT ("user_id", "lat", "lng") DO NOTHING;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "referrals_user_idx" ON "referrals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "social_links_user_idx" ON "social_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_codes_user_purpose_idx" ON "user_codes" USING btree ("user_id","purpose");--> statement-breakpoint
ALTER TABLE "pending_registrations" DROP COLUMN "graduation_year";--> statement-breakpoint
--> Move the old free-form website into the new social links.
INSERT INTO "social_links" ("user_id", "url")
SELECT "id", CASE WHEN "website" ~* '^https?://' THEN "website" ELSE 'https://' || "website" END
FROM "users" WHERE "website" IS NOT NULL AND btrim("website") <> '';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "contact_phone";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "website";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "show_location";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ssoEmail_unique" UNIQUE("sso_email");