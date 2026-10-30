-- Existing lesson columns remain the published version for all readers.
ALTER TABLE "Lesson" ADD COLUMN "draftData" JSONB;
