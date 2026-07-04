-- Add tournament year to existing playgrounds
ALTER TABLE "Playground"
ADD COLUMN "year" INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;

-- Make year explicit on create from app forms
ALTER TABLE "Playground"
ALTER COLUMN "year" DROP DEFAULT;
