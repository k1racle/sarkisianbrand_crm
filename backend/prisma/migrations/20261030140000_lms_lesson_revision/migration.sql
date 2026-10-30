-- An editor must submit the revision they opened, so stale forms cannot
-- silently overwrite another employee's draft or a just-published lesson.
ALTER TABLE "Lesson" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
