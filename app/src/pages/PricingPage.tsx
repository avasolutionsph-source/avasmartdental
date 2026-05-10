import { useEffect } from "react";
import { Nav } from "../sections/Nav";
import { Pricing } from "../sections/Pricing";
import { Footer } from "../sections/Footer";

export default function PricingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Pricing — Ava Smart Dental";
  }, []);
  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main>
        {/* Page header */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="hero-glow absolute inset-0 -z-10 opacity-60" />
          <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
          <div className="mx-auto max-w-4xl px-5 pb-12 pt-12 text-center sm:px-8 sm:pb-20 sm:pt-24">
            <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-brand-700 sm:text-[12px] sm:tracking-[0.22em]">
              Pricing
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight text-fg sm:text-5xl lg:text-6xl">
              Subscribe once.{" "}
              <span className="text-brand-600">Run your whole clinic.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted sm:mt-5 sm:text-lg">
              Pricing in pesos. No feature gates. 14 days free on every plan.
            </p>
          </div>
        </section>

        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
