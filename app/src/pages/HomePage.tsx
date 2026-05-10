import { Nav } from "../sections/Nav";
import { Hero } from "../sections/Hero";
import { Features } from "../sections/Features";
import { LocalSection } from "../sections/LocalSection";
import { PDAStandard } from "../sections/PDAStandard";
import { CompatibleDevices } from "../sections/CompatibleDevices";
import { Footer } from "../sections/Footer";
import { useReveal } from "../lib/useReveal";

export default function HomePage() {
  useReveal();
  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-fg">
      <Nav />
      <main>
        <Hero />
        <PDAStandard />
        <Features />
        <LocalSection />
        <CompatibleDevices />
      </main>
      <Footer />
    </div>
  );
}
