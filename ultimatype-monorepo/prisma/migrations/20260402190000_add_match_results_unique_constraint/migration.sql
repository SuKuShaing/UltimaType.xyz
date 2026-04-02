-- CreateIndex
CREATE UNIQUE INDEX "match_results_match_code_user_id_key" ON "match_results"("match_code", "user_id");
