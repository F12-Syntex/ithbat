-- Add device tracking columns to conversation_logs
ALTER TABLE conversation_logs
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT;

-- Create index for device type filtering
CREATE INDEX IF NOT EXISTS idx_conversation_logs_device_type ON conversation_logs(device_type);
