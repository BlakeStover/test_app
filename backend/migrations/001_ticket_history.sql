CREATE TABLE IF NOT EXISTS ticket_history (
  id           SERIAL PRIMARY KEY,
  ticket_id    INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by   INTEGER NOT NULL REFERENCES users(id),
  field        VARCHAR(50) NOT NULL,   -- 'status' | 'priority' | 'assigned_to'
  old_value    TEXT,                   -- NULL means the field had no prior value
  new_value    TEXT,                   -- NULL means the field was cleared
  changed_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
