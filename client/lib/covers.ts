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
] as const;

export function coverFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++)
    h = (h + key.charCodeAt(i) * (i + 1)) % COVERS.length;
  return COVERS[h];
}

export function photoCardStyle(src: string): { backgroundImage: string } {
  return {
    backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.82), rgba(1,57,32,0.58)), url(${src})`,
  };
}
