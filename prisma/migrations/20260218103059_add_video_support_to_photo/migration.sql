-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "embedUrl" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'image',
ADD COLUMN     "videoLink" TEXT,
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL,
ALTER COLUMN "thumbnailUrl" DROP NOT NULL;
