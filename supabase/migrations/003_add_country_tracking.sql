-- Add country tracking columns to conversation_logs
ALTER TABLE conversation_logs
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Create index for country code filtering (for analytics)
CREATE INDEX IF NOT EXISTS idx_conversation_logs_country_code ON conversation_logs(country_code);
