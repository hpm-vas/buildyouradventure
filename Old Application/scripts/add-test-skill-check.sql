-- Example: Add a skill check to an existing choice
-- Run this in Supabase SQL Editor after running the 015_skill_checks.sql migration

-- First, let's see an example of how to add a skill check to a choice
-- This adds a skill check to the "durch-den-spalt" choice in the "entdeckung" node

-- Option 1: Update an existing choice to add a skill check
-- UPDATE story_choices
-- SET 
--   skill_check_enabled = true,
--   skill_check_dice_type = 'd20',
--   skill_check_dice_count = 1,
--   skill_check_difficulty = 12,
--   skill_check_success_node = 'der-verborgene-raum',
--   skill_check_failure_node = 'zurueck-ins-zimmer',
--   skill_check_modifier = 0,
--   skill_check_label = 'Geschicklichkeit'
-- WHERE node_id = 'durch-den-spalt' AND id = 'der-verborgene-raum';

-- Option 2: Insert a new test choice with a skill check
-- This is a safer approach for testing - adds a new node with a skill check choice

-- First create two outcome nodes (success and failure)
INSERT INTO story_nodes (id, story_id, title, text, sort_order, akt, teil, kapitel)
SELECT 
  'test-skill-success',
  id,
  'Erfolg!',
  'Du hast die Probe bestanden! Deine Geschicklichkeit hat dir geholfen.',
  999,
  1,
  'Test',
  1
FROM stories
WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

INSERT INTO story_nodes (id, story_id, title, text, sort_order, akt, teil, kapitel)
SELECT 
  'test-skill-failure',
  id,
  'Fehlgeschlagen!',
  'Leider hat es nicht geklappt. Vielleicht nächstes Mal.',
  1000,
  1,
  'Test',
  1
FROM stories
WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

-- Create a test hub node that presents the skill check
INSERT INTO story_nodes (id, story_id, title, text, sort_order, akt, teil, kapitel)
SELECT 
  'test-skill-hub',
  id,
  'Probe der Geschicklichkeit',
  'Vor dir liegt eine schmale Felsspalte. Um hindurchzukommen, musst du geschickt sein.\n\nDies ist ein Test für das Würfelsystem. Wähle eine der Optionen unten.',
  998,
  1,
  'Test',
  1
FROM stories
WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

-- Add choices to the test hub - one with skill check, one without
INSERT INTO story_choices (id, story_id, node_id, text, next_node, sort_order,
  skill_check_enabled, skill_check_dice_type, skill_check_dice_count, 
  skill_check_difficulty, skill_check_success_node, skill_check_failure_node,
  skill_check_modifier, skill_check_label)
SELECT 
  'test-skill-d20',
  id,
  'test-skill-hub',
  'Durch die Spalte zwängen',
  'test-skill-success', -- Default nextNode (used if no skill check)
  0,
  true, -- Enable skill check
  'd20',
  1,
  12, -- DC 12
  'test-skill-success',
  'test-skill-failure',
  2, -- +2 modifier
  'Geschicklichkeit'
FROM stories
WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

-- Add a 2d6 skill check option
INSERT INTO story_choices (id, story_id, node_id, text, next_node, sort_order,
  skill_check_enabled, skill_check_dice_type, skill_check_dice_count, 
  skill_check_difficulty, skill_check_success_node, skill_check_failure_node,
  skill_check_modifier, skill_check_label)
SELECT 
  'test-skill-2d6',
  id,
  'test-skill-hub',
  'Vorsichtig vorwärtstasten (2W6)',
  'test-skill-success',
  1,
  true,
  'd6',
  2, -- 2d6
  8, -- DC 8
  'test-skill-success',
  'test-skill-failure',
  0,
  'Wahrnehmung'
FROM stories
WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

-- Add a safe option without skill check
INSERT INTO story_choices (id, story_id, node_id, text, next_node, sort_order,
  skill_check_enabled)
SELECT 
  'test-skill-skip',
  id,
  'test-skill-hub',
  'Umkehren (keine Probe)',
  'start',
  2,
  false
FROM stories
WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

-- Add continue choices to success/failure nodes to go back to start
INSERT INTO story_choices (id, story_id, node_id, text, next_node, sort_order, skill_check_enabled)
SELECT 'test-back-success', id, 'test-skill-success', 'Zurück zum Anfang', 'start', 0, false
FROM stories WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

INSERT INTO story_choices (id, story_id, node_id, text, next_node, sort_order, skill_check_enabled)
SELECT 'test-back-failure', id, 'test-skill-failure', 'Zurück zum Anfang', 'start', 0, false
FROM stories WHERE slug = 'odo'
ON CONFLICT DO NOTHING;

-- To access the test, you can either:
-- 1. Use admin mode to navigate directly to 'test-skill-hub'
-- 2. Or add a choice from an existing node that leads to 'test-skill-hub'

-- Example: Add a hidden test link from the start node (optional)
-- INSERT INTO story_choices (id, story_id, node_id, text, next_node, sort_order, skill_check_enabled)
-- SELECT 'goto-test', id, 'start', '🧪 Zum Würfel-Test', 'test-skill-hub', 99, false
-- FROM stories WHERE slug = 'odo'
-- ON CONFLICT DO NOTHING;
