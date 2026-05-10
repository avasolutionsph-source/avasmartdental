import { useEffect } from "react";
import { Nav } from "../sections/Nav";
import { FAQ } from "../sections/FAQ";
import { Footer } from "../sections/Footer";
import { useReveal } from "../lib/useReveal";

export default function FAQPage() {
  useReveal();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "FAQ — Ava Smart Dental";
  }, []);
  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main>
        {/* Page header */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="hero-glow absolute inset-0 -z-10 opacity-60" />
          <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
          <div className="mx-auto max-w-4xl px-5 pb-16 pt-16 text-center sm:px-8 sm:pb-20 sm:pt-24">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-brand-700">
              FAQ
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-6xl">
              Questions, answered{" "}
              <span className="text-brand-600">honestly.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted">
              Migration, devices, security, Resibo, free trial — straight
              answers, walang kaartehan.
            </p>
          </div>
        </section>

        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
