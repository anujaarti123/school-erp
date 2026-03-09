-- Bus Management Phase 1: Driver, Vehicle, BusRoute, BusStop, Student assignment
-- Run in Supabase SQL Editor

-- 1. Driver table
CREATE TABLE IF NOT EXISTS "BusDriver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    CONSTRAINT "BusDriver_pkey" PRIMARY KEY ("id")
);

-- 2. Vehicle table
CREATE TABLE IF NOT EXISTS "BusVehicle" (
    "id" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "registration" TEXT,
    CONSTRAINT "BusVehicle_pkey" PRIMARY KEY ("id")
);

-- 3. Add driverId and vehicleId to BusRoute (keep driver, vehicle as fallback text)
ALTER TABLE "BusRoute" ADD COLUMN IF NOT EXISTS "driverId" TEXT REFERENCES "BusDriver"("id") ON DELETE SET NULL;
ALTER TABLE "BusRoute" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT REFERENCES "BusVehicle"("id") ON DELETE SET NULL;

-- 4. BusStop table (ordered stops per route with times)
CREATE TABLE IF NOT EXISTS "BusStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "arrivalTime" TEXT,
    "departureTime" TEXT,
    CONSTRAINT "BusStop_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BusStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "BusRoute"("id") ON DELETE CASCADE
);

-- 5. Student bus assignment
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "busRouteId" TEXT REFERENCES "BusRoute"("id") ON DELETE SET NULL;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pickupStopId" TEXT REFERENCES "BusStop"("id") ON DELETE SET NULL;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "dropStopId" TEXT REFERENCES "BusStop"("id") ON DELETE SET NULL;
