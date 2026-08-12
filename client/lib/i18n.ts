"use client";

// Lightweight i18n (P2): dictionary + t() helper + language switcher state.
// Languages: English (default), French, Yoruba. Persisted in localStorage;
// the switcher lives in the header. Scope: chrome strings (nav, hero, auth,
// dashboards) — full page translation is a follow-up per content team.

export type Lang = "en" | "fr" | "yo";

const DICTS = {
  en: {
    "nav.home": "Home",
    "nav.tutors": "Tutors",
    "nav.programmes": "Programmes",
    "nav.subjects": "Subjects",
    "nav.pricing": "Pricing",
    "nav.become": "Become a Tutor",
    "nav.schools": "For Schools",
    "nav.contact": "Contact",
    "hero.title": "Learning beyond boundaries",
    "hero.subtitle":
      "British & Nigerian curricula, exam preparation, private tuition and live cohorts — with vetted tutors.",
    "hero.cta": "Get started",
    "hero.cta2": "Find a tutor",
    "footer.tagline": "Learning beyond boundaries",
    "footer.rights": "All rights reserved.",
    "auth.login": "Log in",
    "auth.signup": "Get started",
    "common.search": "Search",
    "common.back": "Back",
    "common.close": "Close",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.tutors": "Tuteurs",
    "nav.programmes": "Programmes",
    "nav.subjects": "Matières",
    "nav.pricing": "Tarifs",
    "nav.become": "Devenir tuteur",
    "nav.schools": "Pour les écoles",
    "nav.contact": "Contact",
    "hero.title": "Apprendre au-delà des frontières",
    "hero.subtitle":
      "Curriculums britannique et nigérian, préparation aux examens, cours particuliers et cohortes en direct — avec des tuteurs vérifiés.",
    "hero.cta": "Commencer",
    "hero.cta2": "Trouver un tuteur",
    "footer.tagline": "Apprendre au-delà des frontières",
    "footer.rights": "Tous droits réservés.",
    "auth.login": "Connexion",
    "auth.signup": "Commencer",
    "common.search": "Rechercher",
    "common.back": "Retour",
    "common.close": "Fermer",
  },
  yo: {
    "nav.home": "Ile-ile",
    "nav.tutors": "Oluko",
    "nav.programmes": "Eto",
    "nav.subjects": "Koko-eko",
    "nav.pricing": "Owo",
    "nav.become": "Di oluko",
    "nav.schools": "Fun ile-iwe",
    "nav.contact": "Kanasii",
    "hero.title": "Keko kọja awọn ala",
    "hero.subtitle":
      "Awọn eto-eko ti Ilu Gẹẹsi ati Naijiria, igbaradi idanwo, ẹkọ ikọkọ ati awọn ẹgbẹ ifiwe — pẹlu awọn oluko ti a fọwọsi.",
    "hero.cta": "Bẹrẹ",
    "hero.cta2": "Wa oluko",
    "footer.tagline": "Keko kọja awọn ala",
    "footer.rights": "Gbogbo ẹtọ wa ni ipamọ.",
    "auth.login": "Wọle",
    "auth.signup": "Bẹrẹ",
    "common.search": "Wa",
    "common.back": "Pada",
    "common.close": "Pa",
  },
} as const;

export type DictKey = keyof typeof DICTS.en;
export type Dict = Record<DictKey, string>;

const LANG_KEY = "nuvora-lang";
const LANG_LABELS: Record<Lang, string> = { en: "English", fr: "Français", yo: "Yorùbá" };

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(LANG_KEY);
  return v === "fr" || v === "yo" ? v : "en";
}

export function setStoredLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

export const LANG_LABELS_OPTIONS = Object.entries(LANG_LABELS) as [Lang, string][];
