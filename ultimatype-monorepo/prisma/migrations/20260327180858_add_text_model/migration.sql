-- CreateTable
CREATE TABLE "texts" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "texts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "texts_level_language_idx" ON "texts"("level", "language");
