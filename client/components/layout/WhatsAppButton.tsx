"use client";

// WhatsAppButton — floating live-chat button (wa.me). The business number is
// read from the public /api/v1/site/contact endpoint so it is never hardcoded
// in the bundle; when the channel isn't configured the button hides itself.
// Clicking opens WhatsApp in a new tab with a prefilled message.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

const DEFAULT_PREFILL =
  "Hello YK-Virtual! I have a question about your courses and enrolment.";

export function useWhatsAppContact() {
  const [contact, setContact] = useState<{
    number: string;
    link: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ whatsapp_number: string; whatsapp_link: string }>(
      "/site/contact",
    )
      .then((res) => {
        if (cancelled) return;
        if (res?.data?.whatsapp_link) {
          setContact({
            number: res.data.whatsapp_number,
            link: res.data.whatsapp_link,
          });
        }
      })
      .catch(() => {
        /* channel not configured — stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return contact;
}

export function whatsAppHref(link: string, prefill?: string): string {
  try {
    const url = new URL(link);
    if (!prefill) return url.toString();
    url.searchParams.set("text", prefill);
    return url.toString();
  } catch {
    return link;
  }
}

// WhatsAppHomeCard — inline "live chat on WhatsApp" card for the chat widget
// home tab. Hidden when the channel is not configured.
export function WhatsAppHomeCard({
  prefill = DEFAULT_PREFILL,
}: {
  prefill?: string;
}) {
  const contact = useWhatsAppContact();
  if (!contact) return null;
  return (
    <a
      href={whatsAppHref(contact.link, prefill)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-3 rounded-2xl bg-[#25D366]/10 p-3 text-left transition-colors hover:bg-[#25D366]/20"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
        <WhatsAppIcon size={24} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink-900">
          Chat on WhatsApp
        </span>
        <span className="block text-xs text-ink-500">
          Live chat with our team — payments, enrolment, help
        </span>
      </span>
      <ChevronRightIcon />
    </a>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-ink-400"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function WhatsAppButton({
  prefill = DEFAULT_PREFILL,
  className = "",
  label,
}: {
  prefill?: string;
  className?: string;
  label?: string;
}) {
  const contact = useWhatsAppContact();
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    if (!contact) return;
    const t = setTimeout(() => setBounce(true), 1200);
    const h = setInterval(() => {
      setBounce((b) => !b);
    }, 2600);
    return () => {
      clearTimeout(t);
      clearInterval(h);
    };
  }, [contact]);

  if (!contact) return null;

  return (
    <a
      href={whatsAppHref(contact.link, prefill)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ?? "Chat with us on WhatsApp"}
      title={label ?? "Chat with us on WhatsApp"}
      className={className}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform duration-300 hover:scale-105 ${
          bounce ? "-translate-y-1" : "translate-y-0"
        }`}
      >
        <WhatsAppIcon size={28} />
      </span>
    </a>
  );
}
