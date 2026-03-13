-- Agregar columna updated_at a mailbox_threads
ALTER TABLE mailbox_threads 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Trigger function para actualizar updated_at al insertar nuevo mensaje
CREATE OR REPLACE FUNCTION update_mailbox_thread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mailbox_threads
  SET updated_at = timezone('utc'::text, now())
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_mailbox_message_inserted
AFTER INSERT ON mailbox_messages
FOR EACH ROW EXECUTE FUNCTION update_mailbox_thread_updated_at();

-- Crear la tabla mailbox_thread_reads
CREATE TABLE mailbox_thread_reads (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES mailbox_threads(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, thread_id)
);

-- Políticas RLS para mailbox_thread_reads
ALTER TABLE mailbox_thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read receipts" 
ON mailbox_thread_reads FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert/update their own read receipts" 
ON mailbox_thread_reads FOR ALL 
TO authenticated 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());
