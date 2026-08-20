// Digital-skills academy catalogue — single source of truth for the hub and
// every per-course page. Keep slugs stable: they are the public URLs.

export type DigitalCourse = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: "cpu" | "keyboard" | "code" | "brain" | "shield" | "file";
  level: "Beginner" | "Intermediate" | "Advanced";
  ages: string;
  duration: string;
  mode: string;
  price: string;
  color: string; // tailwind-friendly hex for card accents
  skills: string[];
  outcomes: string[];
  modules: { title: string; topics: string[] }[];
  faq: { q: string; a: string }[];
};

export const DIGITAL_COURSES: DigitalCourse[] = [
  {
    slug: "computer-science",
    title: "Computer Science",
    tagline: "IGCSE & SSS computer science with real programming practice",
    description:
      "A structured computer-science programme covering the IGCSE and WAEC/NECO syllabuses: hardware and networks, data representation, algorithms and programming — taught with live coding sessions, past-paper practice and project work.",
    icon: "cpu",
    level: "Intermediate",
    ages: "Ages 11–18",
    duration: "12 weeks per term",
    mode: "Live cohorts · online & in-person",
    price: "From ₦45,000/term",
    color: "#0E7490",
    skills: ["Algorithms", "Data representation", "Networking", "Python", "Past-paper technique"],
    outcomes: [
      "Explain how computers store and process data",
      "Design algorithms with pseudocode and flowcharts",
      "Write and debug Python programs confidently",
      "Answer IGCSE / WAEC theory papers to grade standard",
    ],
    modules: [
      { title: "Computer fundamentals", topics: ["Hardware & software", "Data representation (binary, hex)", "Logic gates"] },
      { title: "Networks & security basics", topics: ["How the internet works", "Network topologies", "Safe online practice"] },
      { title: "Algorithms & programming", topics: ["Pseudocode & flowcharts", "Python fundamentals", "Searching & sorting"] },
      { title: "Exam mastery", topics: ["Past-paper drills", "Practical project", "Mock exam + report"] },
    ],
    faq: [
      { q: "Which syllabus does this cover?", a: "Both Cambridge IGCSE (0478) and the Nigerian SSS1–3 computer studies curriculum, so learners can sit either exam." },
      { q: "Do I need a laptop?", a: "Yes — any laptop that runs a browser is fine. All tools used in class are free and cloud-based." },
      { q: "Can adults join?", a: "Adult learners are welcome in the evening cohorts; the content is the same, paced for older students." },
    ],
  },
  {
    slug: "ict-digital-literacy",
    title: "ICT & Digital Literacy",
    tagline: "Practical computing skills for school, university and the workplace",
    description:
      "From folders and files to spreadsheets, presentations and online research: the essential digital skills every student needs before university and every professional needs on the job.",
    icon: "keyboard",
    level: "Beginner",
    ages: "Ages 8+",
    duration: "8 weeks",
    mode: "Live cohorts · online & in-person",
    price: "From ₦30,000",
    color: "#7C3AED",
    skills: ["File management", "Online research", "Spreadsheets", "Presentations", "Email etiquette"],
    outcomes: [
      "Manage files and folders with confidence",
      "Research and evaluate sources online safely",
      "Build spreadsheets with formulas and charts",
      "Create and deliver clean presentations",
    ],
    modules: [
      { title: "Computer basics", topics: ["Parts of a computer", "Operating systems", "Files & folders"] },
      { title: "Productivity tools", topics: ["Word processing", "Spreadsheets & formulas", "Slides that sell"] },
      { title: "Online world", topics: ["Search & research", "Email & collaboration", "Digital etiquette"] },
      { title: "Capstone", topics: ["Mini project", "Showcase", "Certificate of completion"] },
    ],
    faq: [
      { q: "Is any experience needed?", a: "None. This course starts from switching a computer on and builds up step by step." },
      { q: "Is there a certificate?", a: "Yes — every finisher receives a NUVORA certificate of completion." },
    ],
  },
  {
    slug: "python-programming",
    title: "Python Programming",
    tagline: "From your first line of code to real projects",
    description:
      "Learn the world's most popular first language by building: games, automations, data scripts and a final portfolio project. Small cohorts, live coding, and weekly mini-challenges.",
    icon: "code",
    level: "Beginner",
    ages: "Ages 10+",
    duration: "10 weeks",
    mode: "Live cohorts · online",
    price: "From ₦50,000",
    color: "#2563EB",
    skills: ["Python syntax", "Variables & logic", "Functions", "Data structures", "Project building"],
    outcomes: [
      "Read and write Python confidently",
      "Break problems into functions and loops",
      "Work with lists, dictionaries and files",
      "Ship a portfolio project you can show",
    ],
    modules: [
      { title: "Foundations", topics: ["Print & input", "Variables & types", "Conditionals"] },
      { title: "Control flow", topics: ["Loops", "Functions", "Debugging like a pro"] },
      { title: "Data & files", topics: ["Lists & dicts", "Reading/writing files", "JSON basics"] },
      { title: "Final project", topics: ["Project clinic", "Code review", "Demo day"] },
    ],
    faq: [
      { q: "What will I build?", a: "Learners typically build a quiz game, a to-do app or a data dashboard — we guide each student to a project they care about." },
      { q: "Is this enough to start the AI track?", a: "Yes — finishing Python Programming is the recommended path into the AI & Machine Learning course." },
    ],
  },
  {
    slug: "artificial-intelligence",
    title: "AI & Machine Learning",
    tagline: "Understand AI, use it responsibly, and build with it",
    description:
      "A responsible-AI track: how models learn, what they're good at (and not), prompt craft, and hands-on building with cloud AI tools — ending with a group AI project judged by mentors.",
    icon: "brain",
    level: "Intermediate",
    ages: "Ages 13+",
    duration: "10 weeks",
    mode: "Live cohorts · online",
    price: "From ₦70,000",
    color: "#BE185D",
    skills: ["ML concepts", "Prompt engineering", "AI tooling", "Ethics & safety", "AI project"],
    outcomes: [
      "Explain how AI models learn in plain words",
      "Write strong prompts for study and work",
      "Build a working AI assistant or mini-app",
      "Evaluate AI outputs critically and ethically",
    ],
    modules: [
      { title: "What AI is (and isn't)", topics: ["History & hype", "Machine learning intuition", "Where AI fails"] },
      { title: "Working with AI", topics: ["Prompt craft", "AI for study & revision", "Fact-checking outputs"] },
      { title: "Building with AI", topics: ["No-code AI tools", "APIs in Python", "Mini-app clinic"] },
      { title: "Ethics & capstone", topics: ["Bias & safety", "Team project", "Mentor showcase"] },
    ],
    faq: [
      { q: "Do I need Python first?", a: "Basic Python helps (our Python course is the ideal lead-in), but the build track uses beginner-friendly tools." },
      { q: "Is this just ChatGPT lessons?", a: "No — you'll learn how AI actually works, then build projects with a mix of cloud APIs and no-code tools." },
    ],
  },
  {
    slug: "cybersecurity",
    title: "Cybersecurity Essentials",
    tagline: "Protect yourself and others online — from passwords to penetration thinking",
    description:
      "A hands-on safety-and-security track: password hygiene, phishing defence, privacy, and the attacker mindset behind ethical hacking — with safe, legal lab environments.",
    icon: "shield",
    level: "Intermediate",
    ages: "Ages 12+",
    duration: "8 weeks",
    mode: "Live cohorts · online",
    price: "From ₦55,000",
    color: "#059669",
    skills: ["Password hygiene", "Phishing defence", "Privacy", "Network basics", "Ethical hacking intro"],
    outcomes: [
      "Secure your accounts with strong, unique credentials",
      "Spot and stop phishing and social engineering",
      "Configure privacy on the services you use",
      "Complete a guided ethical-hacking lab safely",
    ],
    modules: [
      { title: "Digital self-defence", topics: ["Passwords & 2FA", "Phishing red flags", "Public Wi-Fi safety"] },
      { title: "Privacy & data", topics: ["What apps know", "Privacy settings", "Digital footprint"] },
      { title: "Security fundamentals", topics: ["Network basics", "Encryption intuition", "Updates & backups"] },
      { title: "Attacker mindset", topics: ["Ethical hacking intro", "Guided labs", "Defence project"] },
    ],
    faq: [
      { q: "Is hacking taught?", a: "Only the defensive mindset — all labs are guided, legal and sandboxed. Nothing we teach is used against real systems." },
      { q: "Is there a certification?", a: "The course prepares learners toward entry-level security certifications; finishers receive a NUVORA certificate." },
    ],
  },
  {
    slug: "microsoft-office",
    title: "Microsoft Office Mastery",
    tagline: "Word, Excel and PowerPoint for exams, university and the office",
    description:
      "A practical productivity course: documents that look professional, spreadsheets that actually calculate, and presentations that land — plus certification exam prep.",
    icon: "file",
    level: "Beginner",
    ages: "Ages 10+",
    duration: "6 weeks",
    mode: "Live cohorts · online & in-person",
    price: "From ₦25,000",
    color: "#B45309",
    skills: ["Word formatting", "Excel formulas", "Charts & PivotTables", "PowerPoint design", "Certification prep"],
    outcomes: [
      "Produce clean, professional documents",
      "Use formulas, charts and PivotTables in Excel",
      "Design and deliver confident presentations",
      "Sit for the Microsoft certification exam prepared",
    ],
    modules: [
      { title: "Word", topics: ["Styles & layout", "Reports & references", "Tables & mail merge"] },
      { title: "Excel", topics: ["Formulas & functions", "Charts", "PivotTables intro"] },
      { title: "PowerPoint", topics: ["Structure & story", "Design principles", "Presenting live"] },
      { title: "Certification prep", topics: ["Exam drill", "Timed practice", "Mock assessment"] },
    ],
    faq: [
      { q: "Which versions are taught?", a: "Microsoft 365 (the cloud version) — the skills transfer to any recent Office version and to Google Workspace." },
      { q: "Is the certification exam included?", a: "Prep is included; the exam itself is booked separately through Microsoft's testing partner." },
    ],
  },
];

export function getDigitalCourse(slug: string): DigitalCourse | undefined {
  return DIGITAL_COURSES.find((c) => c.slug === slug);
}
