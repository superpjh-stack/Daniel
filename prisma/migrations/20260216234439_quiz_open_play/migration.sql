-- Step 1: Add playerName with default empty string
ALTER TABLE "QuizResult" ADD COLUMN "playerName" TEXT NOT NULL DEFAULT '';

-- Step 2: Populate playerName from linked Student
UPDATE "QuizResult" SET "playerName" = s."name"
  FROM "Student" s WHERE "QuizResult"."studentId" = s."id";

-- Step 3: Make studentId optional
ALTER TABLE "QuizResult" ALTER COLUMN "studentId" DROP NOT NULL;

-- Step 4: Drop foreign key, re-create as optional
ALTER TABLE "QuizResult" DROP CONSTRAINT IF EXISTS "QuizResult_studentId_fkey";
ALTER TABLE "QuizResult" ADD CONSTRAINT "QuizResult_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
