-- ELLE DUZENLENDI: drizzle-kit bolumleme DDL'i uretmez.
-- "page_daily" ve "query_daily" tablolarinin sonundaki
--   PARTITION BY RANGE ("date")
-- satirlari elle eklenmistir. Bu dosya yeniden uretilirse tekrar eklenmelidir.
-- Bolumlerin kendisi src/server/db/partitions.ts icindeki ensurePartitions
-- tarafindan olusturulur.

CREATE TABLE "country_daily" (
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"country" text NOT NULL,
	"clicks" bigint NOT NULL,
	"impressions" bigint NOT NULL,
	"position" numeric(6, 2) NOT NULL,
	CONSTRAINT "country_daily_site_id_date_country_pk" PRIMARY KEY("site_id","date","country")
);
--> statement-breakpoint
CREATE TABLE "daily_totals" (
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"clicks" bigint NOT NULL,
	"impressions" bigint NOT NULL,
	"position" numeric(6, 2) NOT NULL,
	CONSTRAINT "daily_totals_site_id_date_pk" PRIMARY KEY("site_id","date")
);
--> statement-breakpoint
CREATE TABLE "device_daily" (
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"device" text NOT NULL,
	"clicks" bigint NOT NULL,
	"impressions" bigint NOT NULL,
	"position" numeric(6, 2) NOT NULL,
	CONSTRAINT "device_daily_site_id_date_device_pk" PRIMARY KEY("site_id","date","device")
);
--> statement-breakpoint
CREATE TABLE "page_daily" (
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"page" text NOT NULL,
	"page_key" uuid GENERATED ALWAYS AS (md5(page)::uuid) STORED,
	"page_title" text,
	"clicks" bigint NOT NULL,
	"impressions" bigint NOT NULL,
	"position" numeric(6, 2) NOT NULL,
	CONSTRAINT "page_daily_site_id_date_page_key_pk" PRIMARY KEY("site_id","date","page_key")
) PARTITION BY RANGE ("date");
--> statement-breakpoint
CREATE TABLE "query_daily" (
	"site_id" uuid NOT NULL,
	"date" date NOT NULL,
	"query" text NOT NULL,
	"query_key" uuid GENERATED ALWAYS AS (md5(query)::uuid) STORED,
	"clicks" bigint NOT NULL,
	"impressions" bigint NOT NULL,
	"position" numeric(6, 2) NOT NULL,
	CONSTRAINT "query_daily_site_id_date_query_key_pk" PRIMARY KEY("site_id","date","query_key")
) PARTITION BY RANGE ("date");
--> statement-breakpoint
ALTER TABLE "country_daily" ADD CONSTRAINT "country_daily_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_totals" ADD CONSTRAINT "daily_totals_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_daily" ADD CONSTRAINT "device_daily_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_daily_site_date_clicks_idx" ON "page_daily" USING btree ("site_id","date","clicks");--> statement-breakpoint
CREATE INDEX "query_daily_site_date_clicks_idx" ON "query_daily" USING btree ("site_id","date","clicks");