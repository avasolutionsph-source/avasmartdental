import { useEffect } from "react";

/**
 * Tracks the mouse position relative to each `.spotlight` element on the page
 * and exposes it as CSS variables `--mx`/`--my`. Pair with the `.spotlight`
 * class in index.css to render a soft radial halo that follows the cursor.
 */
export function useSpotlight() {
  useEffect(() => {
    let raf = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;

    function flush() {
      if (last) {
        last.el.style.setProperty("--mx", `${last.x}px`);
        last.el.style.setProperty("--my", `${last.y}px`);
      }
      raf = 0;
    }

    function handle(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spotlight");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      last = { el: target, x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!raf) raf = requestAnimationFrame(flush);
    }

    document.addEventListener("mousemove", handle, { passive: true });
    return () => {
      document.removeEventListener("mousemove", handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}
