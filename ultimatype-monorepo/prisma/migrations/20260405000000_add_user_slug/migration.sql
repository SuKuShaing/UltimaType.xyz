-- Step 1: Add slug column as nullable
ALTER TABLE "users" ADD COLUMN "slug" TEXT;

-- Step 2: Backfill slugs for existing users (initials + 3 hex chars)
UPDATE "users"
SET "slug" = LOWER(
  CASE
    WHEN POSITION(' ' IN "display_name") > 0
    THEN SUBSTRING("display_name" FROM 1 FOR 1) || SUBSTRING("display_name" FROM POSITION(' ' IN "display_name") + 1 FOR 1)
    ELSE SUBSTRING("display_name" FROM 1 FOR 2)
  END
) || '-' || SUBSTRING(MD5(id) FROM 1 FOR 3)
WHERE "slug" IS NULL;

-- Step 3: Make slug NOT NULL
ALTER TABLE "users" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Add unique index
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");
