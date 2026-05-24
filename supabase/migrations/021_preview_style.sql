-- Add preview_style JSONB column to projects
-- Stores owner's visual customization for the public preview page
-- Schema: { "accent": "#hex", "heroSize": "default|compact|full" }

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS preview_style JSONB NOT NULL DEFAULT '{}';
