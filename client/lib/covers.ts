/** Local marketing photos - never remote Unsplash (preview has no network). */

export const COVERS = [
  "/hero/exam-prep.jpg",
  "/hero/programmes.jpg",
  "/hero/cohorts.jpg",
  "/hero/how-it-works.jpg",
  "/hero/about.jpg",
  "/hero/subjects.jpg",
  "/hero/british.jpg",
  "/hero/nigerian.jpg",
  "/hero/digital.jpg",
  "/hero/checkout.jpg",
  "/hero/home-tutoring.jpg",
  "/hero/utme.jpg",
  "/hero/test-prep.jpg",
  "/hero/international.jpg",
  "/hero/plus.jpg",
  "/hero/entrance-exam.jpg",
  "/home/card-ss.jpg",
  "/home/card-jss.jpg",
  "/home/card-exam.jpg",
  "/home/card-cbt.jpg",
  "/home/ykay-students.png",
] as const;

export function coverFor(key: string): string {
  const k = key.toLowerCase();
  if (/(digital|coding|ict|python|computer)/.test(k)) return "/hero/digital.jpg";
  if (/(british|igcse|a-level|cambridge)/.test(k)) return "/hero/british.jpg";
  if (/(nigerian|nerdc|waec|neco|bece)/.test(k)) return "/hero/nigerian.jpg";
  if (/(utme|jamb)/.test(k)) return "/hero/utme.jpg";
  if (/(tutor|home tutor|1-on-1|private)/.test(k)) return "/hero/home-tutoring.jpg";
  if (/(cbt|computer-based)/.test(k)) return "/home/card-cbt.jpg";
  if (/(exam|test prep|gmat|sat|gre)/.test(k)) return "/home/card-exam.jpg";
  if (/(jss|junior|bece)/.test(k)) return "/home/card-jss.jpg";
  if (/(ss1|ss2|ss3|senior|wassce)/.test(k)) return "/home/card-ss.jpg";
  if (/(cohort|online class)/.test(k)) return "/hero/cohorts.jpg";
  if (/(plus)/.test(k)) return "/hero/plus.jpg";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i) * (i + 1)) % COVERS.length;
  return COVERS[h];
}

export function photoCardStyle(src: string): { backgroundImage: string } {
  return {
    backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.82), rgba(1,57,32,0.58)), url(${src})`,
  };
}
