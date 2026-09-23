import Link from "next/link";
import {
  Home,
  MonitorPlay,
  GraduationCap,
  Baby,
  FileCheck,
} from "lucide-react";

import { AnimatedText } from "@/components/ui/animated-text";
// "No Matter The Learning Need, There's A Tutor For Your Child!" - Tuteria v2
// with real descriptions per need.

const NEEDS = [
  {
    icon: <Home size={20} />,
    label: "Physical One-on-One Lessons",
    desc: "Give your child hands-on tailored learning experience with the best tutors in the comfort of your home.",
    href: "/private-tuition",
  },
  {
    icon: <MonitorPlay size={20} />,
    label: "Online One-on-One Lessons",
    desc: "Give your child an immersive class experience using our state-of-the-art digital tools with the best tutors.",
    href: "/online-classes",
  },
  {
    icon: <GraduationCap size={20} />,
    label: "Homeschooling",
    desc: "Our dedicated tutors bring the classroom to your home with lessons tailored to your child's individual needs.",
    href: "/curricula/nigerian",
  },
  {
    icon: <Baby size={20} />,
    label: "Early Years Foundation",
    desc: "Not just catching up - propelling your child forward with a strong academic foundation that lasts a lifetime.",
    href: "/curricula/british",
  },
  {
    icon: <FileCheck size={20} />,
    label: "Exam Preparation",
    desc: "Pass entrance exams into top schools - Common Entrance, Checkpoint, 11+, IGCSE, SATs, SSCE, BECE, UTME/JAMB.",
    href: "/exam-prep",
  },
];

export function LearningNeeds() {
  return (
    <section className="border-t border-black/10 bg-white py-16">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl tracking-[0.02em] text-[#0F2A1A] md:text-3xl">
            <AnimatedText
              text="No Matter The Learning Need, There's A Tutor For Your Child!"
              delay={0.0}
            />
          </h2>
          <p className="mt-3 text-[#0F2A1A]/70">
            We have all the solutions your child needs to excel in school.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {NEEDS.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="group rounded-2xl border border-black/10 bg-[#F9F6ED] p-6 text-center transition-all hover:-translate-y-1 hover:border-[#D6FF57]/40 hover:shadow-card"
            >
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-[#0F2A1A] shadow-soft transition-colors group-hover:bg-[#0F2A1A] group-hover:text-[#D6FF57]">
                {n.icon}
              </div>
              <p className="mt-4 text-sm font-bold leading-snug text-[#0F2A1A]/85">
                {n.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[#0F2A1A]/65">
                {n.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
