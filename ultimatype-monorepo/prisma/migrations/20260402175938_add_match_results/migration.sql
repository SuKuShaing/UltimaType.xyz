-- CreateTable
CREATE TABLE "match_results" (
    "id" TEXT NOT NULL,
    "match_code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wpm" DOUBLE PRECISION NOT NULL,
    "precision" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "missing_chars" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "finished" BOOLEAN NOT NULL,
    "finished_at" TIMESTAMP(3),
    "rank" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_results_user_id_created_at_idx" ON "match_results"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "match_results_level_created_at_idx" ON "match_results"("level", "created_at");

-- CreateIndex
CREATE INDEX "match_results_user_id_level_created_at_idx" ON "match_results"("user_id", "level", "created_at");

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
