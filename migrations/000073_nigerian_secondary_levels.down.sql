-- 000073_nigerian_secondary_levels.down: remove only what 000073 inserted.
-- (Safe even if 000052 also inserted the rows on a fresh install — they are
-- the same six slugs and 000052's own down migration removes them too.)

DELETE FROM levels WHERE slug IN ('jss1','jss2','jss3','sss1','sss2','sss3');
