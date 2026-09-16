ALTER TABLE "Product" ADD COLUMN "purposes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Product_purposes_idx" ON "Product" USING GIN ("purposes");
CREATE INDEX "Product_features_idx" ON "Product" USING GIN ("features");
