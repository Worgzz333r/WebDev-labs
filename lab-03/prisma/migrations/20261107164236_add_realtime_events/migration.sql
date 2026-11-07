-- CreateTable
CREATE TABLE "RealtimeEvent" (
    "seq" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "rooms" TEXT[],
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealtimeEvent_pkey" PRIMARY KEY ("seq")
);

-- CreateIndex
CREATE INDEX "RealtimeEvent_rooms_idx" ON "RealtimeEvent" USING GIN ("rooms");

-- CreateIndex
CREATE INDEX "RealtimeEvent_createdAt_idx" ON "RealtimeEvent"("createdAt");
