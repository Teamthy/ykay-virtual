"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, Phone, ChevronDown, Menu, X, Play } from "lucide-react";
import { AuthNav } from "@/components/layout/AuthNav";
import { navServices } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function Header() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-ink-100">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex items-center gap-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold text-brand-blue tracking-tight">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h12a4 4 0 0 1 4 4v14a2 2 0 0 1-2 2H4V4zm2 2v16h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6z"/>
          </svg>
          ykay
        </Link>

        {/* Services dropdown */}
        <button
          onClick={() => setServicesOpen(!servicesOpen)}
          className={cn(
            "hidden lg:flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-ink-800 transition-colors",
            servicesOpen ? "bg-ink-100" : "hover:bg-ink-100"
          )}
        >
          Our Services
          <ChevronDown size={14} className={cn("transition-transform", servicesOpen && "rotate-180")} />
        </button>

        {/* Search */}
        <div className="hidden md:block flex-1 max-w-[560px] relative">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="text"
            placeholder="What do you want to learn?"
            className="w-full pl-12 pr-5 py-3.5 bg-ink-100 rounded-full text-sm text-ink-700 focus:bg-ink-200 focus:ring-2 focus:ring-brand-blue/20 outline-none transition-all"
          />
        </div>

        {/* Right links */}
        <div className="hidden lg:flex items-center gap-8 ml-auto">
          <a className="flex items-center gap-2 text-sm font-medium text-ink-800 hover:text-brand-blue transition-colors cursor-pointer">
            <Phone size={16} />
            Contact Us
          </a>
          <Link href="/tutors/apply" className="text-sm font-semibold text-ink-800 hover:text-brand-blue transition-colors">
            Become a Tutor
          </Link>
        </div>

        {/* Mobile toggle */}
        <AuthNav />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden ml-auto p-2 text-ink-800"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mega menu */}
      {servicesOpen && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-ink-100 shadow-lift py-10 animate-slide-down">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-9">
            <div className="col-span-2 md:col-span-1 pr-6 border-r border-dashed border-ink-200">
              <div
                className="w-full h-40 rounded-xl bg-cover bg-center mb-4"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&q=80')" }}
              />
              <div className="text-sm font-bold text-ink-800 mb-2">Mrs. Awoderu's Testimonial</div>
              <div className="text-xs text-ink-600 leading-relaxed mb-4">
                How Tolu scored 325 of 400 in UME, and 5As, 4Bs in GCE with expert help from YKAY tutors.
              </div>
              <a className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue cursor-pointer">
                <span className="w-7 h-7 rounded-full bg-brand-blue-light flex items-center justify-center">
                  <Play size={10} fill="#1a4fd4" className="text-brand-blue ml-0.5" />
                </span>
                Watch Video
              </a>
            </div>
            {Object.entries(navServices).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-bold text-ink-800 mb-4">{category}</h4>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item} className="text-sm text-ink-600 hover:text-brand-blue transition-colors cursor-pointer">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-ink-100 px-6 py-6 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="What do you want to learn?"
              className="w-full pl-11 pr-4 py-3 bg-ink-100 rounded-full text-sm outline-none"
            />
          </div>
          <a className="block py-2 text-sm font-semibold text-ink-800">Our Services</a>
          <a className="block py-2 text-sm text-ink-800">Contact Us</a>
          <Link href="/tutors/apply" className="block py-2 text-sm font-semibold text-ink-800">Become a Tutor</Link>
          <Link href="/login" className="block py-2 text-sm text-ink-800">Login</Link>
        </div>
      )}
    </header>
  );
}