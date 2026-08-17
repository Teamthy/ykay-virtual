// Exam-prep subject matrix — single source of truth for the exam-prep
// [exam]/[subject] screens (mirrors client/lib/exam-prep-data.ts on the web so
// the two never drift). Content is factual and board-agnostic: each subject's
// core topics are the themes common to the major syllabuses (WAEC, NECO, JAMB,
// IGCSE, A-Level), and each exam's structure/grading reflects its published
// format. Keep it factual — no invented statistics, cut-offs or "predicted"
// questions.

export type ExamSubject = {
  slug: string;
  name: string;
  /** Matches the live /subjects/[slug] catalogue page for cross-linking. */
  catalogueSlug: string;
  overview: string;
  topics: string[];
  skills: string[];
};

export type ExamInfo = {
  slug: string;
  code: string;
  name: string;
  fullName: string;
  level: string;
  format: string;
  structure: string[];
  grading: string;
  /** Subject slugs offered in this exam. */
  subjects: string[];
};

export const EXAM_SUBJECTS: ExamSubject[] = [
  {
    slug: "mathematics",
    name: "Mathematics",
    catalogueSlug: "mathematics",
    overview:
      "Mathematics is the most widely required subject across WAEC, NECO, JAMB, IGCSE and A-Level. Papers reward speed, accuracy and the ability to apply standard methods to unfamiliar problems.",
    topics: [
      "Number & numeration",
      "Algebra",
      "Geometry & mensuration",
      "Trigonometry",
      "Calculus (A-Level and further work)",
      "Statistics & probability",
      "Vectors & transformations",
    ],
    skills: [
      "Numerical problem-solving",
      "Applying formulas correctly",
      "Working accurately under time pressure",
      "Interpreting worded problems",
    ],
  },
  {
    slug: "english-language",
    name: "English Language",
    catalogueSlug: "english-language",
    overview:
      "English Language papers test reading, writing and grammar. In JAMB it is the compulsory Use of English paper; in WAEC, NECO, IGCSE and A-Level it is a core subject.",
    topics: [
      "Comprehension & summary",
      "Composition / essay writing",
      "Grammar & sentence structure",
      "Vocabulary & lexis",
      "Oral / listening (where examined)",
      "Letter & report writing",
    ],
    skills: [
      "Reading comprehension",
      "Summary writing",
      "Grammatical accuracy",
      "Structuring essays",
    ],
  },
  {
    slug: "physics",
    name: "Physics",
    catalogueSlug: "physics",
    overview:
      "Physics papers test your understanding of matter, energy and their interactions — and, crucially, your ability to apply laws to numerical and practical problems.",
    topics: [
      "Mechanics",
      "Waves & sound",
      "Thermal physics",
      "Electricity & magnetism",
      "Light & optics",
      "Modern physics",
      "Fields & energy",
    ],
    skills: [
      "Numerical problem-solving",
      "Applying physical laws",
      "Units & measurement",
      "Practical reasoning",
    ],
  },
  {
    slug: "chemistry",
    name: "Chemistry",
    catalogueSlug: "chemistry",
    overview:
      "Chemistry combines recall of facts with calculation and practical technique. Papers span physical, inorganic and organic chemistry across every major board.",
    topics: [
      "Atomic structure & the periodic table",
      "Chemical bonding",
      "Stoichiometry & the mole",
      "Acids, bases & salts",
      "Organic chemistry",
      "Electrochemistry",
      "Rates & equilibrium",
    ],
    skills: [
      "Writing balanced equations",
      "Mole calculations",
      "Practical technique",
      "Applying theory to unfamiliar scenarios",
    ],
  },
  {
    slug: "biology",
    name: "Biology",
    catalogueSlug: "biology",
    overview:
      "Biology papers reward accurate recall, clear diagrams and the ability to apply processes to real systems — from cells to whole ecosystems.",
    topics: [
      "Cell biology",
      "Classification & diversity",
      "Nutrition in plants & animals",
      "Respiration & transport",
      "Reproduction & genetics",
      "Ecology & the environment",
    ],
    skills: [
      "Accurate recall",
      "Drawing & labelling diagrams",
      "Designing experiments",
      "Applying processes to real examples",
    ],
  },
  {
    slug: "economics",
    name: "Economics",
    catalogueSlug: "economics",
    overview:
      "Economics tests definitions, diagrams and the ability to explain and evaluate how individuals, firms and governments make choices.",
    topics: [
      "Basic economic concepts",
      "Demand, supply & price",
      "Production & costs",
      "Market structures",
      "National income & money",
      "International trade",
    ],
    skills: [
      "Defining concepts precisely",
      "Drawing demand/supply diagrams",
      "Interpreting data",
      "Evaluating policy",
    ],
  },
  {
    slug: "government",
    name: "Government",
    catalogueSlug: "government",
    overview:
      "Government papers test knowledge of political systems, constitutions and institutions, and the ability to build reasoned arguments.",
    topics: [
      "Basic concepts of government",
      "Constitutions",
      "Organs of government",
      "Political parties & elections",
      "Citizenship",
      "International relations",
    ],
    skills: [
      "Recalling concepts & institutions",
      "Comparing systems",
      "Building essay arguments",
      "Applying theory to current affairs",
    ],
  },
  {
    slug: "literature-in-english",
    name: "Literature in English",
    catalogueSlug: "literature-in-english",
    overview:
      "Literature in English tests close reading and critical writing across prose, drama and poetry — including prescribed African and world texts.",
    topics: [
      "Prose analysis",
      "Drama & theatre",
      "Poetry",
      "Literary devices",
      "Prescribed texts",
      "Critical essay writing",
    ],
    skills: [
      "Close reading",
      "Quoting & analysis",
      "Structuring critical essays",
      "Understanding context",
    ],
  },
  {
    slug: "geography",
    name: "Geography",
    catalogueSlug: "geography",
    overview:
      "Geography combines map skills, physical processes and human systems, with a strong practical and case-study element.",
    topics: [
      "Map reading & interpretation",
      "Weather & climate",
      "Landforms & processes",
      "Population & settlement",
      "Economic geography",
      "Regional geography",
    ],
    skills: [
      "Map & graph interpretation",
      "Explaining physical processes",
      "Using case studies",
      "Presenting data",
    ],
  },
  {
    slug: "history",
    name: "History",
    catalogueSlug: "history",
    overview:
      "History papers test chronology, source analysis and the ability to explain causes and consequences.",
    topics: [
      "Nigerian & West African history",
      "The slave trade & abolition",
      "Colonial rule & nationalism",
      "World wars & their effects",
      "Independence movements",
      "International organisations",
    ],
    skills: [
      "Understanding chronology",
      "Analysing sources",
      "Explaining cause & consequence",
      "Essay writing",
    ],
  },
  {
    slug: "business-studies",
    name: "Business Studies",
    catalogueSlug: "business-studies",
    overview:
      "Business Studies tests terminology, simple financial calculations and the ability to apply ideas to realistic business situations.",
    topics: [
      "Business aims & ownership",
      "Marketing",
      "Production & operations",
      "People in business",
      "Finance & accounting basics",
      "The external environment",
    ],
    skills: [
      "Using business terminology",
      "Simple financial maths",
      "Case-study application",
      "Evaluation",
    ],
  },
];

export const EXAMS: ExamInfo[] = [
  {
    slug: "jamb",
    code: "JAMB",
    name: "UTME (JAMB)",
    fullName: "Unified Tertiary Matriculation Examination — Joint Admissions and Matriculation Board",
    level: "University admission — Nigeria",
    format: "Computer-based test (CBT).",
    structure: [
      "Use of English — compulsory (60 questions).",
      "Three other subjects relevant to your chosen course (40 questions each).",
      "180 objective questions in total, answered in 2 hours.",
      "A four-subject combination tailored to the course you are applying for.",
    ],
    grading:
      "Scored out of 400. Universities and courses set their own cut-off marks — check the institution's published requirement for your course.",
    subjects: [
      "english-language",
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "economics",
      "government",
      "literature-in-english",
      "geography",
      "history",
    ],
  },
  {
    slug: "waec",
    code: "WAEC",
    name: "WASSCE (WAEC)",
    fullName: "West African Senior School Certificate Examination",
    level: "Secondary school leaving — Nigeria & West Africa",
    format: "Written papers (objective and essay/theory), with practical and oral papers in relevant subjects.",
    structure: [
      "School candidates sit 8–9 subjects.",
      "English Language and Mathematics are compulsory.",
      "Science subjects include practical papers; languages include oral/aural components.",
    ],
    grading:
      "Grades A1–F9 (A1 highest). University entry typically requires credit passes (A1–C6) in five subjects including English and Mathematics.",
    subjects: [
      "english-language",
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "economics",
      "government",
      "literature-in-english",
      "geography",
      "history",
      "business-studies",
    ],
  },
  {
    slug: "neco",
    code: "NECO",
    name: "SSCE (NECO)",
    fullName: "National Examinations Council — Senior School Certificate Examination",
    level: "Secondary school leaving — Nigeria",
    format: "Written papers (objective and essay/theory), with practical papers where applicable; June/July and November/December sessions.",
    structure: [
      "Candidates sit 8–9 subjects.",
      "English Language and Mathematics are compulsory.",
      "Closely mirrors the WAEC syllabus — preparation overlaps.",
    ],
    grading: "Grades A1–F9; credit passes are A1–C6, comparable to WASSCE.",
    subjects: [
      "english-language",
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "economics",
      "government",
      "literature-in-english",
      "geography",
      "history",
      "business-studies",
    ],
  },
  {
    slug: "igcse",
    code: "IGCSE",
    name: "International GCSE",
    fullName: "International General Certificate of Secondary Education (Cambridge or Pearson Edexcel)",
    level: "International secondary qualification (Years 10–11, ages 14–16)",
    format: "Written exams; many subjects offer Core and Extended tiers; some include coursework or practical components.",
    structure: [
      "Most learners take 5–9 subjects.",
      "Mathematics and English are typical requirements for further study.",
      "Set by Cambridge Assessment International Education or Pearson Edexcel.",
    ],
    grading: "Cambridge: A*–G (9–1 in newer syllabuses). Edexcel: 9–1, with 9 the highest.",
    subjects: [
      "english-language",
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "economics",
      "geography",
      "history",
      "literature-in-english",
      "business-studies",
    ],
  },
  {
    slug: "alevel",
    code: "A-Level",
    name: "Advanced Level",
    fullName: "GCE Advanced Level (AS and A2)",
    level: "Pre-university qualification (ages 16–18)",
    format: "Linear written exams; AS is typically taken after the first year and A2 after the second (or examined together).",
    structure: [
      "Learners usually take 3–4 subjects.",
      "Assessment is primarily written exams; some subjects include coursework or practicals.",
    ],
    grading: "A*–E (A* highest). Universities make conditional offers based on predicted and final grades.",
    subjects: [
      "english-language",
      "mathematics",
      "physics",
      "chemistry",
      "biology",
      "economics",
      "geography",
      "history",
      "literature-in-english",
      "business-studies",
    ],
  },
];

export function getSubject(slug: string): ExamSubject | undefined {
  return EXAM_SUBJECTS.find((s) => s.slug === slug);
}

export function getExam(slug: string): ExamInfo | undefined {
  return EXAMS.find((e) => e.slug === slug);
}

/** Flat list of every matrix URL (exam + subject) for generateStaticParams and the sitemap. */
export function getExamPrepPages(): { exam: string; subject: string }[] {
  const pages: { exam: string; subject: string }[] = [];
  for (const exam of EXAMS) {
    for (const subject of exam.subjects) pages.push({ exam: exam.slug, subject });
  }
  return pages;
}

/** Exams with resolved subject names, for the hub page. */
export const EXAM_MATRIX = EXAMS.map((exam) => ({
  slug: exam.slug,
  code: exam.code,
  name: exam.name,
  subjects: exam.subjects
    .map((slug) => getSubject(slug))
    .filter((s): s is ExamSubject => Boolean(s))
    .map((s) => ({ slug: s.slug, name: s.name })),
}));
