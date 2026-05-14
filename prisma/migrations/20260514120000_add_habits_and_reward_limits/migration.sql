-- AlterTable: extend Reward with weekly_limit + category
ALTER TABLE "Reward" ADD COLUMN "weekly_limit" INTEGER;
ALTER TABLE "Reward" ADD COLUMN "category" TEXT;

-- CreateTable: Habit
CREATE TABLE "Habit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'sparkles',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "cadence" TEXT NOT NULL DEFAULT 'daily',
    "daily_target" REAL,
    "weekly_days_target" INTEGER NOT NULL DEFAULT 7,
    "weekly_target" REAL,
    "daily_points" INTEGER NOT NULL DEFAULT 2,
    "weekly_bonus_points" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: HabitLog
CREATE TABLE "HabitLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "habitId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "value" REAL NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_key" ON "HabitLog"("habitId", "date");
