-- Migration: Rename tactics/outcomes to projects/actions
-- This migration renames tables and columns to align with UI terminology
-- Strategies > Projects > Actions

-- Step 1: Rename tables
ALTER TABLE tactics RENAME TO projects;
ALTER TABLE outcomes RENAME TO actions;
ALTER TABLE outcome_documents RENAME TO action_documents;
ALTER TABLE outcome_checklist_items RENAME TO action_checklist_items;

-- Step 2: Rename columns in actions table (formerly outcomes)
ALTER TABLE actions RENAME COLUMN tactic_id TO project_id;

-- Step 3: Rename columns in action_documents table (formerly outcome_documents)
ALTER TABLE action_documents RENAME COLUMN outcome_id TO action_id;

-- Step 4: Rename columns in action_checklist_items table (formerly outcome_checklist_items)
ALTER TABLE action_checklist_items RENAME COLUMN outcome_id TO action_id;

-- Step 5: Rename columns in activities table
ALTER TABLE activities RENAME COLUMN tactic_id TO project_id;

-- Note: meeting_notes table already uses selectedProjectIds and selectedActionIds in JSON
-- No changes needed for meeting_notes table columns
