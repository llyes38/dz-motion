"use client";

import { useState } from "react";

const ITEMS = [
  {
    id: "faq-1",
    question: "C'est quoi exactement DZ Motion ?",
    answer:
      "Tu choisis une danse DZ, tu importes une photo, et on génère une vidéo animée prête à partager.",
  },
  {
    id: "faq-2",
    question: "Combien de photos dois-je importer ?",
    answer: "Une seule photo suffit pour le MVP.",
  },
  {
    id: "faq-3",
    question: "Quelle photo donne le meilleur résultat ?",
    answer:
      "Visage bien visible, bonne lumière, de préférence de face, sans filtre extrême.",
  },
  {
    id: "faq-4",
    question: "Je peux télécharger la vidéo pour TikTok ?",
    answer:
      "Oui, tu peux la télécharger et l'utiliser sur TikTok, Reels ou Shorts.",
  },
] as const;

export default function Faq() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="w-full bg-[#f4f6f5] py-14">
      <div className="mx-auto max-w-[980px] px-5">
        <h2 className="text-center text-xl font-bold text-[#1a1a1a] sm:text-2xl">
          FAQ DZ Motion
        </h2>
        <div className="mt-10 flex flex-col gap-4">
          {ITEMS.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`${item.id}-answer`}
                  id={`${item.id}-button`}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium text-[#1a1a1a] transition-colors hover:text-[#006233] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006233] focus-visible:ring-offset-2"
                >
                  <span>{item.question}</span>
                  <span
                    className={`shrink-0 text-[#006233] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>
                <div
                  id={`${item.id}-answer`}
                  role="region"
                  aria-labelledby={`${item.id}-button`}
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-sm text-gray-600">{item.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
