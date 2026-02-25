const CARDS = [
  {
    title: "Interface intuitive",
    description:
      "Choisis une danse, ajoute ta photo et génère. Aucun réglage compliqué.",
  },
  {
    title: "Résultat TikTok-ready",
    description:
      "Format vertical, rendu propre, prêt à partager sur TikTok & Reels.",
  },
  {
    title: "Données respectées",
    description:
      "Ta photo sert uniquement à générer ta vidéo. Rien de public sans toi.",
  },
] as const;

export default function WhyChoose() {
  return (
    <section className="w-full bg-white py-14">
      <div className="mx-auto max-w-[980px] px-5">
        <h2 className="text-center text-xl font-bold text-[#1a1a1a] sm:text-2xl">
          Pourquoi choisir DZ Motion
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {CARDS.map((card) => (
            <div
              key={card.title}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-[#d21034]"
                aria-hidden
              />
              <h3 className="font-semibold text-[#1a1a1a]">{card.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{card.description}</p>
              <div
                className="absolute bottom-0 left-0 h-0.5 w-full bg-[#d21034] opacity-30"
                aria-hidden
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
