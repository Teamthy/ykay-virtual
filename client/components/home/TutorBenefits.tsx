import { Zap, TrendingUp, CalendarClock, LifeBuoy } from "lucide-react";

// Become-a-tutor benefits grid (reference 001445): constant students,
// professional growth, teach anytime/anywhere, amazing support.

const BENEFITS = [
  {
    icon: <Zap size={20} />,
    title: "Teach on a schedule that fits you",
    desc: "Decide when and how many hours you want to teach, and fit lessons to your schedule. Teach students around your area or online.",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "Grow professionally",
    desc: "Attend training webinars, collect reviews and get tips to upgrade your skills. You'll get all the help you need from our team to grow.",
  },
  {
    icon: <CalendarClock size={20} />,
    title: "Teach anytime, anywhere",
    desc: "Private lessons, small-group cohorts or online classes - choose the format and pace that works for you and your learners.",
  },
  {
    icon: <LifeBuoy size={20} />,
    title: "Amazing support",
    desc: "We support every step of the way and are always on-hand to answer your questions - or give you a well-deserved pat on the back!",
  },
];

export function TutorBenefits() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid sm:grid-cols-2 gap-6">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-ink-100 bg-surface-muted p-7"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-navy text-white">
                {b.icon}
              </div>
              <h3 className="mt-4 font-bold text-brand-navy">{b.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
