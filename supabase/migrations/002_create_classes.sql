-- Migration 002: classes table
-- Implements: F-001, F-006, F-009
-- Review fixes: REV-024 (completed status)

CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  max_capacity integer NOT NULL DEFAULT 16 CHECK (max_capacity > 0),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_classes_starts_at ON public.classes (starts_at);
CREATE INDEX idx_classes_status_starts_at ON public.classes (status, starts_at);

-- Updated_at trigger
CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
