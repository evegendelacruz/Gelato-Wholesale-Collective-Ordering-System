-- Migration: Create reports table for yearly production reports
-- This table stores consolidated production analysis reports by year

CREATE TABLE IF NOT EXISTS public.reports (
  id bigserial NOT NULL,
  summary_id character varying(255) NOT NULL,
  year integer NOT NULL,
  created_by character varying(255) DEFAULT 'System',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  report_data jsonb,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_year_unique UNIQUE (year),
  CONSTRAINT reports_summary_id_unique UNIQUE (summary_id)
);

-- Create index on year for faster lookups
CREATE INDEX IF NOT EXISTS idx_reports_year ON public.reports USING btree (year);
