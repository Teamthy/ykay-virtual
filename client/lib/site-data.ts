export const siteConfig = {
  name: "NUVORA",
  brand: "nuvora",
  tagline: "Learning beyond boundaries",
  description: "British & Nigerian curricula · Exam preparation · Private tuition · Live cohorts.",
};

export const navServices = {
  "British Curriculum": ["Year 7", "Year 8", "Year 9", "IGCSE Year 10", "IGCSE Year 11", "A Level"],
  "Nigerian Curriculum": ["JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3"],
  "Examinations": ["IGCSE", "WAEC", "NECO", "JAMB", "A Level"],
  "Learning Modes": ["Private Tuition", "Small-group Cohort", "Revision Bootcamp", "Holiday Programme"],
  "Digital Academy": ["Computer Science", "Python", "Artificial Intelligence", "Cybersecurity", "Microsoft Office"],
};

export const heroSlides = [
  {
    tag: "Trusted by 9000+ Parents",
    title: "Better, Brighter Future For Your Kids.",
    desc: "Get personalized home tutoring that is designed to guide your children toward exam success, boost their confidence, and get better school grades.",
    cta: "Get Started",
    ctaSecondary: "Learn how it works",
    bg: "#194F82",
    label: "Home Tutoring",
    img: "/hero/home-tutoring.jpg",
  },
  {
    tag: "Trusted by Families Across 4 Continents",
    title: "Foreign-Standard Tutoring without the Foreign Price Tag",
    desc: "Give your child the quality of education families abroad pay thousands for — delivered by top Nigerian tutors at up to 70% less.",
    cta: "Book a Tutor Today",
    bg: "#056FD2",
    label: "International",
    img: "/hero/international.jpg",
  },
  {
    tag: "Highest Score: 345 in 2025 Prep Cohort",
    title: "UTME 2026 Prep – Your Child's Best Chance at Admission Success",
    desc: "Don't leave your future to chance — be UTME-ready and set for admission success with weekly mocks, 200+ practice tests and scholarships.",
    cta: "Enroll for UTME 2026 Prep",
    bg: "#0A033C",
    label: "UTME 2026",
    img: "/hero/utme.jpg",
  },
  {
    tag: "95% Exam Success Rate",
    title: "Study, Work, and Thrive Abroad with Perfect Test Scores",
    desc: "Prepare for IELTS, GRE, GMAT, TEF and more with proven strategies and top tutors.",
    cta: "Start your Journey today",
    bg: "#B3470B",
    label: "Test Prep",
    img: "/hero/test-prep.jpg",
  },
  {
    tag: "Top 5% of Tutors Nationwide",
    title: "Upgrade Your Child's Learning with NUVORA Plus",
    desc: "Give your child the ultimate learning advantage with NUVORA Plus — our premium tutoring service designed for families who want the best.",
    cta: "Unlock Premium Tutoring",
    bg: "#194F82",
    label: "NUVORA Plus",
    img: "/hero/nuvora-plus.jpg",
  },
  {
    tag: "95% Success Rate",
    title: "Prepare for Entrance Exams into Top Schools in Nigeria & Abroad",
    desc: "Expert prep for WAEC, IGCSE, GCSE, BECE, 11+, Common Entrance, and SAT to guarantee your child's high performance.",
    cta: "Book a Slot",
    bg: "#005A2B",
    label: "Entrance Exam",
    img: "/hero/entrance-exam.jpg",
  },
];

// Local portrait pool (Batch 3) — the community collage cycles these;
// no remote hotlinks on the home page.
export const tutorImages = [
  "/tutors/chinasa.jpg",
  "/tutors/oluwatobi.jpg",
  "/tutors/olanike.jpg",
  "/tutors/adewale.jpg",
  "/tutors/judith.jpg",
  "/tutors/demilola.jpg",
];

export const tutorPositions = [
  { top: "12%", left: "8%", size: 60 },
  { top: "22%", left: "18%", size: 78 },
  { top: "42%", left: "5%", size: 52 },
  { top: "52%", left: "20%", size: 70 },
  { top: "68%", left: "12%", size: 62 },
  { top: "78%", left: "26%", size: 58 },
  { top: "38%", left: "30%", size: 46 },
  { top: "18%", right: "18%", size: 72 },
  { top: "38%", right: "8%", size: 68 },
  { top: "48%", right: "24%", size: 50 },
  { top: "62%", right: "14%", size: 64 },
  { top: "76%", right: "22%", size: 56 },
  { top: "30%", right: "32%", size: 44 },
  { top: "58%", right: "32%", size: 48 },
];

export const featuredTutor = {
  name: "Chinasa",
  rating: 4.87,
  reviews: 28,
  country: "🇳🇬",
  hours: 2548,
  students: 34,
  qualification: "M.Ed in Mathematics Education from UNILAG",
  teaches: "Teaches the British & Nigerian Syllabus for Grades 1-6.",
  photo: "/tutors/chinasa.jpg",
};

export const stats = [
  { num: "10k+", label: "Vetted tutors" },
  { num: "280k+", label: "Lessons taught" },
  { num: "38k+", label: "Students supported" },
];



export const accordionItems = [
  { num: "1", title: "NUVORA Insights™ Assessment", content: "Comprehensive evaluation of your child's current academic level, learning style and knowledge gaps to build a strong foundation." },
  { num: "2", title: "Adaptive Learning Plans", content: "Customised learning plans that adapt to your child's pace and preferences for maximum effectiveness and long-term retention." },
  { num: "3", title: "Child-Centered Learning", content: "Every lesson is tailored to engage your child based on their interests, strengths and unique learning preferences." },
  { num: "4", title: "Periodic Evaluation", content: "Regular structured assessments to track progress and refine the learning approach as your child grows." },
  { num: "5", title: "Progress Reports & Reviews", content: "Detailed reports after every lesson so you always know exactly how your child is performing and where to focus next." },
];

// Fixture testimonials removed (G5.3): the homepage carousel and the
// TestimonialsSection now render only consent-gated rows from
// /content/testimonials.

// Each exam card links to its fully built prep page (Batch 2).
export const examCards = [
  { title: "IELTS Prep", href: "/ielts-toefl" },
  { title: "GMAT Classes", href: "/gmat" },
  { title: "ICAN Prep", href: "/test-prep" },
  { title: "GRE Classes", href: "/gre" },
  { title: "SATs Prep", href: "/sat" },
  { title: "TOEFL Prep", href: "/ielts-toefl" },
  { title: "PTE Prep", href: "/ielts-toefl" },
  { title: "ACT Prep", href: "/sat" },
];

export const trustLogos = ["MIT | SOLVE", "Forbes", "COBIS", "Cambridge Assessment", "Pearson Edexcel"];