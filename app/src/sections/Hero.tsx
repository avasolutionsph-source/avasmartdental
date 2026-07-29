import { ArrowRight, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { MonitorFrame, LaptopFrame, TabletFrame, PhoneFrame } from "../components/Devices";
import { DesktopScreen } from "../components/screens/DesktopScreen";
import { LaptopScreen } from "../components/screens/LaptopScreen";
import { TabletScreen } from "../components/screens/TabletScreen";
import { PhoneScreen } from "../components/screens/PhoneScreen";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div aria-hidden className="brand-blob b1 left-1/4 top-1/3 h-80 w-80" />
      <div aria-hidden className="brand-blob b2 right-1/4 top-1/4 h-96 w-96" />

      <div className="relative mx-auto max-w-7xl px-5 pb-6 pt-10 text-center sm:px-8 sm:pt-20">
        <p className="fade-in inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 sm:gap-2 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]">
          <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">Engineered by a real dentist · Made in the Philippines</span>
          <span className="sm:hidden">By a real dentist · 🇵🇭 PH</span>
        </p>

        <h1 className="fade-in fade-in-d1 mx-auto mt-4 max-w-4xl text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[56px] sm:leading-[1.02] lg:text-[76px]">
          <span className="text-gradient-brand">Your entire dental clinic.</span>
          <br />
          <span className="text-fg">One subscription. Every device.</span>
        </h1>

        <div className="fade-in fade-in-d2 mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <Link
            to="/pricing"
            className="group shimmer-sweep inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-[15px] font-bold text-white shadow-clinical transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-glow-brand"
          >
            Start free trial
            <ArrowRight className="arrow-nudge h-4 w-4" />
          </Link>
          <Link
            to="/pricing"
            className="card-hover inline-flex items-center justify-center gap-2 rounded-full border border-line-2 bg-white px-6 py-3 text-[15px] font-semibold text-fg-2 hover:border-brand-300 hover:text-fg hover:shadow-md"
          >
            See pricing
          </Link>
        </div>

        <p className="fade-in fade-in-d3 mt-4 text-xs text-fg-subtle">
          18 days free · pay by GCash/Maya QR · cancel anytime
        </p>
      </div>

      {/* Device showcase — CSS-driven entrance + continuous float */}
      <div className="relative mx-auto mt-6 max-w-6xl px-5 pb-20 sm:mt-14 sm:px-8 sm:pb-40">
        {/* Mobile: just the laptop centered, full width */}
        <div className="fade-in-scale fade-in-d4 mx-auto max-w-md sm:hidden">
          <div className="float-mid">
            <LaptopFrame>
              <LaptopScreen />
            </LaptopFrame>
          </div>
        </div>

        {/* Tablet+ : full multi-device cluster */}
        <div className="relative mx-auto hidden h-[560px] w-full max-w-[1000px] sm:block lg:h-[620px]">
          {/* Monitor — center back */}
          <div className="fade-in-scale fade-in-d3 absolute left-1/2 top-0 z-0 w-[68%] max-w-[680px] -translate-x-1/2">
            <div className="float-slow">
              <MonitorFrame>
                <DesktopScreen />
              </MonitorFrame>
            </div>
          </div>

          {/* Laptop — front-left */}
          <div className="fade-in fade-in-d5 absolute bottom-0 left-2 z-10 w-[42%] max-w-[400px]">
            <div className="float-mid">
              <LaptopFrame>
                <LaptopScreen />
              </LaptopFrame>
            </div>
          </div>

          {/* Tablet — back-right */}
          <div className="fade-in fade-in-d6 absolute bottom-2 right-[6%] z-10 w-[19%] max-w-[170px]">
            <div className="float-fast">
              <TabletFrame>
                <TabletScreen />
              </TabletFrame>
            </div>
          </div>

          {/* Phone — front-right */}
          <div className="fade-in fade-in-d7 absolute -bottom-1 right-0 z-20 w-[13%] max-w-[100px]">
            <div className="float-mid">
              <PhoneFrame>
                <PhoneScreen />
              </PhoneFrame>
            </div>
          </div>
        </div>

        <p className="fade-in-soft fade-in-d8 mt-8 text-center text-xs text-fg-subtle sm:mt-14">
          *Subscription required. All your clinic data, in real time.
        </p>
      </div>
    </section>
  );
}
