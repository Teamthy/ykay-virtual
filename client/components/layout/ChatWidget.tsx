"use client";
import { useState } from "react";
import { X, MessageCircle } from "lucide-react";

export function ChatWidget() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {visible && (
        <div className="absolute bottom-20 right-0 bg-white pl-4 pr-10 py-4 rounded-2xl shadow-hero flex items-center gap-3 w-[290px] animate-slide-up">
          <div
            className="w-10 h-10 rounded-full bg-cover flex-shrink-0"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80')" }}
          />
          <div className="text-xs text-ink-700 leading-snug">
            Hi there! Need a tutor? Chat with us here.
          </div>
          <button onClick={() => setVisible(false)} className="absolute top-2.5 right-2.5 text-ink-400 hover:text-ink-600">
            <X size={14} />
          </button>
        </div>
      )}
      <button className="w-14 h-14 bg-[#25d366] rounded-full flex items-center justify-center text-white shadow-[0_8px_24px_rgba(37,211,102,0.4)] hover:scale-105 transition-transform">
        <MessageCircle size={26} fill="white" />
      </button>
    </div>
  );
}