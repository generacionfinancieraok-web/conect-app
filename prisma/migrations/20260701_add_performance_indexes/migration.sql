-- CreateIndex: listings — acelera listados activos ordenados por fecha y precio
CREATE INDEX IF NOT EXISTS "listings_status_createdAt_idx" ON "listings"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "listings_status_promoted_createdAt_idx" ON "listings"("status", "promoted" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "listings_status_price_idx" ON "listings"("status", "price");

-- CreateIndex: messages — acelera carga de historial de conversaciones
CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_conversationId_read_idx" ON "messages"("conversationId", "read");

-- CreateIndex: notifications — acelera listado de notificaciones por usuario y estado
CREATE INDEX IF NOT EXISTS "notifications_userId_read_createdAt_idx" ON "notifications"("userId", "read", "createdAt" DESC);
