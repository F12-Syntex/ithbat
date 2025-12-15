-- Create conversation_logs table for storing research history
CREATE TABLE IF NOT EXISTS conversation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  steps JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  is_follow_up BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_conversation_logs_session_id ON conversation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON conversation_logs(created_at DESC);

-- Enable Row Level Security (optional - currently allowing all reads for logs page)
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserts from service role
CREATE POLICY "Allow service role inserts" ON conversation_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy to allow reads for viewing logs
CREATE POLICY "Allow all reads" ON conversation_logs
  FOR SELECT
  USING (true);
