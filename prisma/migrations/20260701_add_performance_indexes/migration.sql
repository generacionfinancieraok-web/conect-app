-- CreateIndex: Listing — acelera listados activos ordenados por fecha y precio
CREATE INDEX IF NOT EXISTS "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Listing_status_promoted_createdAt_idx" ON "Listing"("status", "promoted" DESC, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Listing_status_price_idx" ON "Listing"("status", "price");

-- CreateIndex: Message — acelera carga de historial de conversaciones
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_conversationId_read_idx" ON "Message"("conversationId", "read");

-- CreateIndex: Notification — acelera listado de notificaciones por usuario y estado
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt" DESC);
