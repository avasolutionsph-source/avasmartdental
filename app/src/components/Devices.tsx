import type { ReactNode } from "react";

/* Desktop monitor — Apple Studio Display style, light bezel */
export function MonitorFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-[14px] border border-[#1c1530]/15 bg-[#2a2440] p-[6px] shadow-device">
        <div className="overflow-hidden rounded-[8px] bg-white">{children}</div>
      </div>
      <div className="mx-auto h-2 w-[98%] rounded-b-md border-x border-b border-[#1c1530]/15 bg-gradient-to-b from-[#2a2440] to-[#1c1530]" />
      <div className="mx-auto mt-1 h-8 w-3 rounded-md bg-gradient-to-b from-[#2a2440] via-[#3b3357] to-[#2a2440]" />
      <div className="relative mx-auto mt-0.5">
        <div className="mx-auto h-2 w-32 rounded-[100%] bg-gradient-to-b from-[#3b3357] to-[#2a2440]" />
        <div className="mx-auto -mt-1 h-1 w-28 rounded-[100%] bg-black/20 blur-[2px]" />
      </div>
    </div>
  );
}

/* Laptop — silver bezel */
export function LaptopFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-t-[14px] border border-[#1c1530]/15 bg-[#2a2440] p-[6px] pb-2 shadow-device">
        <div className="mx-auto mb-1 h-1 w-12 rounded-full bg-white/10" />
        <div className="overflow-hidden rounded-[8px] bg-white">{children}</div>
      </div>
      <div className="relative">
        <div className="mx-auto h-2.5 w-[112%] -translate-x-[5%] rounded-b-2xl border-x border-b border-[#1c1530]/15 bg-gradient-to-b from-[#3b3357] to-[#1c1530]" />
        <div className="absolute left-1/2 top-0 h-2 w-12 -translate-x-1/2 rounded-b-xl bg-black/30" />
      </div>
    </div>
  );
}

/* Tablet */
export function TabletFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-[22px] border border-[#1c1530]/15 bg-[#2a2440] p-[5px] shadow-device">
        <div className="relative overflow-hidden rounded-[18px] bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

/* Phone */
export function PhoneFrame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-hidden rounded-[36px] border border-[#1c1530]/15 bg-[#2a2440] p-[5px] shadow-device">
        <div className="relative overflow-hidden rounded-[31px] bg-white">
          <div className="absolute left-1/2 top-1.5 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-[#1c1530]" />
          {children}
        </div>
      </div>
    </div>
  );
}
