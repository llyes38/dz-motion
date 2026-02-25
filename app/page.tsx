"use client";

import { useCallback, useRef, useState } from "react";
import HowItWorks from "@/components/HowItWorks";
import WhyChoose from "@/components/WhyChoose";
import Faq from "@/components/Faq";

const DANCES = [
  { id: "chaoui", label: "Danse Chaoui", videoSrc: "/reference/chaoui.mp4" },
  { id: "kabyle", label: "Danse Kabyle", videoSrc: "/reference/kabyle.mp4" },
  { id: "assimi", label: "Danse 'Assimi", videoSrc: "/reference/assimi.mp4" },
] as const;

type ResultState = "idle" | "loading" | "completed" | "error";

export default function Home() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [danceId, setDanceId] = useState<string>(DANCES[0].id);
  const [resultState, setResultState] = useState<ResultState>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setImageError(null);
      setImageDataUrl(null);
      setResultState("idle");
      setVideoUrl(null);

      const file = e.target.files?.[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        setImageError("Choisis une image (JPEG, PNG, WebP ou GIF).");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setImageDataUrl(result);
        } else {
          setImageError("Impossible de lire l'image.");
        }
      };
      reader.onerror = () => setImageError("Erreur lors de la lecture du fichier.");
      reader.readAsDataURL(file);
    },
    []
  );

  const pollStatus = useCallback((jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });
        const data = await res.json();

        if (data.status === "completed" && data.videoUrl) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setResultState("completed");
          setVideoUrl(data.videoUrl);
        } else if (data.status === "failed") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setResultState("error");
          setErrorMessage("La génération a échoué.");
        }
      } catch {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setResultState("error");
        setErrorMessage("Erreur de connexion.");
      }
    }, 2000);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageDataUrl) return;

    setResultState("loading");
    setErrorMessage(null);
    setVideoUrl(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ danceId, imageDataUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setResultState("error");
        setErrorMessage(data.error || "Erreur lors du démarrage.");
        return;
      }

      const { jobId } = await res.json();
      pollStatus(jobId);
    } catch {
      setResultState("error");
      setErrorMessage("Erreur de connexion.");
    }
  }, [imageDataUrl, danceId, pollStatus]);

  const canGenerate = !!imageDataUrl && resultState !== "loading";

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a]">
      <main className="mx-auto max-w-[420px] px-5 py-10">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-[#006233]">DZ Motion 🇩🇿</h1>
          <div className="mx-auto mt-2 h-0.5 w-12 bg-[#d21034]" />
          <p className="mt-4 text-base text-[#4a4a4a]">
            🇩🇿 Ta culture. Ta vibe. Ton style.
          </p>
        </header>

        <section className="mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="mb-3 block text-sm font-medium text-[#1a1a1a]">
              Ta photo
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 transition-colors hover:border-[#006233]/40 hover:bg-[#e9f5ee]/30">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="rounded-xl bg-[#006233] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0a8f4b]">
                Choisir une image
              </span>
              <span className="mt-2 text-xs text-gray-500">JPEG, PNG, WebP ou GIF</span>
            </label>
            {imageError && (
              <p className="mt-3 text-sm text-[#d21034]" role="alert">
                {imageError}
              </p>
            )}
            {imageDataUrl && (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                <img
                  src={imageDataUrl}
                  alt="Preview"
                  className="h-44 w-full object-cover"
                />
              </div>
            )}
          </div>
        </section>

        <section className="mb-8">
          <label className="mb-3 block text-sm font-medium text-[#1a1a1a]">
            Choisis ta danse
          </label>
          <div className="grid grid-cols-1 gap-4">
            {DANCES.map((dance) => {
              const isSelected = danceId === dance.id;
              return (
                <button
                  key={dance.id}
                  type="button"
                  onClick={() => setDanceId(dance.id)}
                  className={`group relative w-full overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                    isSelected
                      ? "border-[#006233] bg-[#e9f5ee] ring-2 ring-[#006233]/30"
                      : "border-gray-200 hover:border-[#006233]/50"
                  }`}
                >
                  <div className="aspect-video w-full overflow-hidden bg-gray-100">
                    <video
                      src={dance.videoSrc}
                      muted
                      loop
                      playsInline
                      autoPlay={isSelected}
                      className="h-full w-full object-cover"
                      aria-hidden
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span
                      className={`font-medium ${
                        isSelected ? "text-[#006233]" : "text-[#1a1a1a]"
                      }`}
                    >
                      {dance.label}
                    </span>
                    {isSelected && (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d21034]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full rounded-xl bg-[#006233] px-4 py-3.5 font-medium text-white shadow-md transition-colors hover:bg-[#0a8f4b] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#006233]"
        >
          {resultState === "loading" ? "Génération en cours..." : "Générer ma vidéo"}
        </button>

        <section className="mt-10">
          {resultState === "idle" && (
            <p className="text-center text-sm text-gray-500">
              Uploade une photo et choisis une danse pour commencer.
            </p>
          )}
          {resultState === "loading" && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#006233] border-t-transparent" />
              <p className="text-sm text-gray-600">Génération en cours...</p>
            </div>
          )}
          {resultState === "completed" && videoUrl && (
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl"
                playsInline
              />
            </div>
          )}
          {resultState === "error" && errorMessage && (
            <p
              className="rounded-xl border border-[#d21034]/30 bg-[#d21034]/5 p-4 text-sm text-[#d21034]"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </section>
      </main>

      <HowItWorks />
      <WhyChoose />
      <Faq />
    </div>
  );
}
