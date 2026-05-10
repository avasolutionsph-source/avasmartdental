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

      <div className="mx-auto max-w-7xl px-5 pb-8 pt-12 text-center sm:px-8 sm:pt-20">
        <p className="reveal inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
          <Stethoscope className="h-3.5 w-3.5" />
          Engineered by a real dentist · Made in the Philippines
        </p>
        <h1 className="reveal mx-auto mt-4 max-w-4xl text-[44px] font-bold leading-[1.02] tracking-tight sm:text-[64px] lg:text-[76px]">
          <span className="text-gradient-brand">Your entire dental clinic.</span>
          <br />
          <span className="text-fg">One subscription. Every device.</span>
        </h1>
        <div className="reveal mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/pricing"
            className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-[15px] font-bold text-white shadow-clinical transition hover:bg-brand-700"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-white px-6 py-3 text-[15px] font-semibold text-fg-2 transition hover:border-brand-300 hover:text-fg"
          >
            See pricing
          </Link>
        </div>
        <p className="reveal mt-3 text-xs text-fg-subtle">
          14 days free · no credit card · cancel anytime
        </p>
      </div>

      {/* Device showcase */}
      <div className="reveal relative mx-auto mt-8 max-w-6xl px-5 pb-32 sm:mt-14 sm:px-8 sm:pb-40">
        <div className="relative mx-auto h-[440px] w-full max-w-[1000px] sm:h-[560px] lg:h-[620px]">
          {/* Monitor — center back, z-0 */}
          <div className="absolute left-1/2 top-0 z-0 w-[68%] max-w-[680px] -translate-x-1/2">
            <MonitorFrame>
              <DesktopScreen />
            </MonitorFrame>
          </div>

          {/* Laptop — front-left, z-10 (overlaps monitor) */}
          <div className="absolute bottom-0 left-0 z-10 w-[42%] max-w-[400px] sm:left-2">
            <LaptopFrame>
              <LaptopScreen />
            </LaptopFrame>
          </div>

          {/* Tablet — back-right, z-10 (peeks behind phone) */}
          <div className="absolute bottom-2 right-[6%] z-10 hidden w-[19%] max-w-[170px] sm:block">
            <TabletFrame>
              <TabletScreen />
            </TabletFrame>
          </div>

          {/* Phone — front-right, z-20 (overlaps tablet) */}
          <div className="absolute -bottom-1 right-0 z-20 w-[13%] max-w-[100px]">
            <PhoneFrame>
              <PhoneScreen />
            </PhoneFrame>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-fg-subtle sm:mt-14">
          *Subscription required. All your clinic data, in real time.
        </p>
      </div>
    </section>
  );
}
