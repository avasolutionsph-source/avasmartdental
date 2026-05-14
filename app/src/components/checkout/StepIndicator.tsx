import { Check } from "lucide-react";

type Props = {
  steps: { id: string; label: string }[];
  current: number;
};

export function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-8 sm:w-8 ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-brand-600 text-white shadow-glow-brand"
                      : "bg-surface-3 text-fg-subtle"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  active ? "text-fg" : done ? "text-fg-2" : "text-fg-subtle"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 transition-colors ${
                  done ? "bg-brand-600" : "bg-line"
                }`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
