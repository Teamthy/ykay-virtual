-- 000052_curriculum_levels: seed Nigerian + British curriculum levels so the
-- learner "current level" dropdowns (parent dashboard, onboarding wizard) are
-- curriculum-governed instead of free text.

INSERT INTO levels (curriculum_id, name, slug, order_index, description)
SELECT c.id, v.name, v.slug, v.order_index, v.description
FROM curricula c,
     (VALUES
        -- Nigerian curriculum
        ('nigerian', 'Primary 1', 'primary-1', 10, 'Nigerian primary school'),
        ('nigerian', 'Primary 2', 'primary-2', 11, 'Nigerian primary school'),
        ('nigerian', 'Primary 3', 'primary-3', 12, 'Nigerian primary school'),
        ('nigerian', 'Primary 4', 'primary-4', 13, 'Nigerian primary school'),
        ('nigerian', 'Primary 5', 'primary-5', 14, 'Nigerian primary school'),
        ('nigerian', 'Primary 6', 'primary-6', 15, 'Nigerian primary school'),
        ('Nigerian', 'JSS1', 'jss1', 20, 'Junior Secondary School 1'),
        ('Nigerian', 'JSS2', 'jss2', 21, 'Junior Secondary School 2'),
        ('Nigerian', 'JSS3', 'jss3', 22, 'Junior Secondary School 3 (BECE)'),
        ('Nigerian', 'SSS1', 'sss1', 30, 'Senior Secondary School 1'),
        ('Nigerian', 'SSS2', 'sss2', 31, 'Senior Secondary School 2'),
        ('Nigerian', 'SSS3', 'sss3', 32, 'Senior Secondary School 3 (WAEC/NECO/JAMB)'),
        -- British curriculum
        ('british', 'Reception', 'reception', 5, 'Early Years Foundation Stage'),
        ('british', 'Year 1', 'year-1', 11, 'Key Stage 1'),
        ('british', 'Year 2', 'year-2', 12, 'Key Stage 1'),
        ('british', 'Year 3', 'year-3', 13, 'Key Stage 2'),
        ('british', 'Year 4', 'year-4', 14, 'Key Stage 2'),
        ('british', 'Year 5', 'year-5', 15, 'Key Stage 2'),
        ('british', 'Year 6', 'year-6', 16, 'Key Stage 2'),
        ('british', 'Year 7', 'year-7', 17, 'Key Stage 3'),
        ('british', 'Year 8', 'year-8', 18, 'Key Stage 3'),
        ('british', 'Year 9', 'year-9', 19, 'Key Stage 3'),
        ('british', 'Year 10', 'year-10', 20, 'IGCSE/GCSE'),
        ('british', 'Year 11', 'year-11', 21, 'IGCSE/GCSE'),
        ('british', 'Year 12', 'year-12', 30, 'A Level / Sixth Form'),
        ('british', 'Year 13', 'year-13', 31, 'A Level / Sixth Form')
     ) AS v(curriculum_slug, name, slug, order_index, description)
WHERE c.slug = v.curriculum_slug
ON CONFLICT (curriculum_id, slug) DO NOTHING;
