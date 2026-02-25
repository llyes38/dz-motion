const STEPS = [
  {
    number: 1,
    title: "Importe ta photo",
    description:
      "Choisis une photo nette avec le visage bien visible. Une seule photo suffit.",
  },
  {
    number: 2,
    title: "Choisis une danse DZ",
    description:
      "Sélectionne une danse (Chaoui, Kabyle, 'Assimi...). Le mouvement servira de référence.",
  },
  {
    number: 3,
    title: "Génère & télécharge",
    description:
      "Clique sur Générer. Tu reçois une vidéo verticale prête à être postée sur TikTok.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="w-full bg-[#f4f6f5] py-14">
      <div className="mx-auto max-w-[980px] px-5">
        <h2 className="text-center text-xl font-bold text-[#1a1a1a] sm:text-2xl">
          Comment utiliser DZ Motion en 3 étapes
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Importe ta photo, choisis une danse, puis génère et partage.
        </p>
        <div className="mt-10 rounded-2xl bg-white p-6 shadow-sm sm:p-8 md:grid md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center md:items-center md:text-center"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#006233] bg-white text-xl font-bold text-[#006233]"
                aria-hidden
              >
                {step.number}
              </div>
              <h3 className="mt-4 font-semibold text-[#1a1a1a]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
