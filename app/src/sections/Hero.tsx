import { ArrowRight, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MonitorFrame, LaptopFrame, TabletFrame, PhoneFrame } from "../components/Devices";
import { DesktopScreen } from "../components/screens/DesktopScreen";
import { LaptopScreen } from "../components/screens/LaptopScreen";
import { TabletScreen } from "../components/screens/TabletScreen";
import { PhoneScreen } from "../components/screens/PhoneScreen";
import { fadeUp, stagger } from "../lib/motion";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" />
      <div className="bg-grid absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />

      <motion.div
        className="mx-auto max-w-7xl px-5 pb-6 pt-10 text-center sm:px-8 sm:pt-20"
        variants={stagger(0.1, 0.12)}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-700 sm:gap-2 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]"
        >
          <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="hidden sm:inline">Engineered by a real dentist · Made in the Philippines</span>
          <span className="sm:hidden">By a real dentist · 🇵🇭 PH</span>
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="mx-auto mt-4 max-w-4xl text-[34px] font-bold leading-[1.05] tracking-tight sm:text-[56px] sm:leading-[1.02] lg:text-[76px]"
        >
          <span className="text-gradient-brand">Your entire dental clinic.</span>
          <br />
          <span className="text-fg">One subscription. Every device.</span>
        </motion.h1>

        <motion.div
          variants={fadeUp}
          className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
        >
          <Link
            to="/pricing"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-[15px] font-bold text-white shadow-clinical transition-all duration-300 hover:bg-brand-700 hover:shadow-[0_8px_24px_-6px_rgba(124,58,237,0.45)]"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line-2 bg-white px-6 py-3 text-[15px] font-semibold text-fg-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:text-fg hover:shadow-md"
          >
            See pricing
          </Link>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-4 text-xs text-fg-subtle">
          14 days free · no credit card · cancel anytime
        </motion.p>
      </motion.div>

      {/* Device showcase — orchestrated entrance + continuous float */}
      <div className="relative mx-auto mt-6 max-w-6xl px-5 pb-20 sm:mt-14 sm:px-8 sm:pb-40">
        {/* Mobile: just the laptop centered, full width */}
        <motion.div
          className="mx-auto max-w-md sm:hidden"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="float-mid">
            <LaptopFrame>
              <LaptopScreen />
            </LaptopFrame>
          </div>
        </motion.div>

        {/* Tablet+ : full multi-device cluster, each device entering from a different direction */}
        <div className="relative mx-auto hidden h-[560px] w-full max-w-[1000px] sm:block lg:h-[620px]">
          {/* Monitor — center back, z-0 */}
          <motion.div
            className="absolute left-1/2 top-0 z-0 w-[68%] max-w-[680px] -translate-x-1/2"
            initial={{ opacity: 0, y: -28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="float-slow">
              <MonitorFrame>
                <DesktopScreen />
              </MonitorFrame>
            </div>
          </motion.div>

          {/* Laptop — front-left, z-10 */}
          <motion.div
            className="absolute bottom-0 left-2 z-10 w-[42%] max-w-[400px]"
            initial={{ opacity: 0, x: -40, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.9, delay: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="float-mid">
              <LaptopFrame>
                <LaptopScreen />
              </LaptopFrame>
            </div>
          </motion.div>

          {/* Tablet — back-right, z-10 */}
          <motion.div
            className="absolute bottom-2 right-[6%] z-10 w-[19%] max-w-[170px]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="float-fast">
              <TabletFrame>
                <TabletScreen />
              </TabletFrame>
            </div>
          </motion.div>

          {/* Phone — front-right, z-20 */}
          <motion.div
            className="absolute -bottom-1 right-0 z-20 w-[13%] max-w-[100px]"
            initial={{ opacity: 0, x: 30, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.9, delay: 1.0, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="float-mid">
              <PhoneFrame>
                <PhoneScreen />
              </PhoneFrame>
            </div>
          </motion.div>
        </div>

        <motion.p
          className="mt-8 text-center text-xs text-fg-subtle sm:mt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.3 }}
        >
          *Subscription required. All your clinic data, in real time.
        </motion.p>
      </div>
    </section>
  );
}
