import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

type Phase = {
  key: string;
  label: string;
  hint: string;
  durationMs: number;
};

const phases: Phase[] = [
  {
    key: "workspace",
    label: "Creating your workspace",
    hint: "Setting up your clinic in Supabase",
    durationMs: 1300,
  },
  {
    key: "trial",
    label: "Activating 14-day trial",
    hint: "Almost there — preparing your dashboard",
    durationMs: 900,
  },
];

type Props = {
  /** Trigger the sequence. Animation begins when this becomes true. */
  active: boolean;
  /** Fires once the visual sequence completes. */
  onComplete: () => void;
};

export function BuildingAnimation({ active, onComplete }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let i = 0;
    setPhaseIdx(0);

    function step() {
      if (cancelled) return;
      const t = window.setTimeout(() => {
        if (cancelled) return;
        i += 1;
        if (i >= phases.length) {
          onComplete();
        } else {
          setPhaseIdx(i);
          step();
        }
      }, phases[i].durationMs);
      return t;
    }

    step();
    return () => {
      cancelled = true;
    };
  }, [active, onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center py-6 sm:py-10"
    >
      {/* Building blocks motif */}
      <div className="relative h-32 w-32 sm:h-40 sm:w-40">
        <div aria-hidden className="absolute inset-0 rounded-full bg-brand-100/60 blur-2xl" />
        <div className="relative grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="block rounded-md bg-gradient-to-br from-brand-500 to-brand-700 opacity-90 shadow-glow-brand"
              style={{
                animation: `block-pop 1.4s ${i * 0.08}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <h3 className="mt-6 text-xl font-bold tracking-tight text-fg sm:text-2xl">
        Building your clinic
      </h3>
      <p className="mt-1 text-sm text-fg-muted">
        This usually takes just a few seconds.
      </p>

      <ol className="mt-8 w-full max-w-md space-y-3">
        {phases.map((p, i) => {
          const done = i < phaseIdx;
          const active = i === phaseIdx;
          return (
            <li
              key={p.key}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ${
                done
                  ? "border-brand-200 bg-brand-50/40"
                  : active
                    ? "border-brand-300 bg-white shadow-clinical"
                    : "border-line bg-surface-2 opacity-60"
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-600 text-white"
                      : "bg-surface-3 text-fg-subtle"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    done || active ? "text-fg" : "text-fg-subtle"
                  }`}
                >
                  {p.label}
                </p>
                <p className="truncate text-xs text-fg-muted">{p.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <style>{`
        @keyframes block-pop {
          0%, 100% { transform: scale(0.7); opacity: 0.4; }
          50%      { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
