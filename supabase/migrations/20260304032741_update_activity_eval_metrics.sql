ALTER TABLE activity_evaluations
  ADD COLUMN IF NOT EXISTS emotional_utility integer DEFAULT NULL CHECK (emotional_utility BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS energy_post integer DEFAULT NULL CHECK (energy_post BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS feedback_rating integer DEFAULT NULL CHECK (feedback_rating BETWEEN 1 AND 7);
