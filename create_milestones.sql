-- Create milestones for existing tactics that don't have them yet
-- This will create 7 milestones (1-7) for each tactic

INSERT INTO milestones (id, tactic_id, milestone_number, status, start_date, completion_date, notes)
SELECT 
  gen_random_uuid() as id,
  t.id as tactic_id,
  m.milestone_number,
  'not_started' as status,
  NULL as start_date,
  NULL as completion_date,
  NULL as notes
FROM tactics t
CROSS JOIN (
  SELECT 1 as milestone_number UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4 UNION ALL
  SELECT 5 UNION ALL
  SELECT 6 UNION ALL
  SELECT 7
) m
WHERE NOT EXISTS (
  SELECT 1 FROM milestones ms 
  WHERE ms.tactic_id = t.id AND ms.milestone_number = m.milestone_number
);
