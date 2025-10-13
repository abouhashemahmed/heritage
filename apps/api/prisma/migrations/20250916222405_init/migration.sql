/*
  Warnings:

  - The primary key for the `_ProductToTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_RecipeToTag` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_UserHeritages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_ProductToTag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_RecipeToTag` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_UserHeritages` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_ProductToTag" DROP CONSTRAINT "_ProductToTag_AB_pkey";

-- AlterTable
ALTER TABLE "_RecipeToTag" DROP CONSTRAINT "_RecipeToTag_AB_pkey";

-- AlterTable
ALTER TABLE "_UserHeritages" DROP CONSTRAINT "_UserHeritages_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToTag_AB_unique" ON "_ProductToTag"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_RecipeToTag_AB_unique" ON "_RecipeToTag"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_UserHeritages_AB_unique" ON "_UserHeritages"("A", "B");
