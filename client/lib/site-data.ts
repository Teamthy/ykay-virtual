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

// Unused invented hero/stat fixtures removed (round 52).

// Local portrait pool (Batch 3) - the community collage cycles these;
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
  { title: "GMAT Classes", href: "/gmat" },
  { title: "GRE Classes", href: "/gre" },
  { title: "SATs Prep", href: "/sat" },
  { title: "ACT Prep", href: "/sat" },
];

export const trustLogos = ["MIT | SOLVE", "Forbes", "COBIS", "Cambridge Assessment", "Pearson Edexcel"];