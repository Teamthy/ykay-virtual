-- 000052_curriculum_levels.down: remove seeded curriculum levels (only the
-- rows this migration inserted, by slug).

DELETE FROM levels WHERE slug IN (
  'primary-1','primary-2','primary-3','primary-4','primary-5','primary-6',
  'jss1','jss2','jss3','sss1','sss2','sss3',
  'reception','year-1','year-2','year-3','year-4','year-5','year-6','year-7',
  'year-8','year-9','year-10','year-11','year-12','year-13'
);
