import { Logo } from "../components/Logo";

const cols = [
  {
    h: "Product",
    items: [
      ["Features", "/#features"],
      ["Devices", "/#devices"],
      ["Pricing", "/pricing"],
      ["FAQ", "/faq"],
    ],
  },
  {
    h: "Modules",
    items: [
      ["Patients", "/#features"],
      ["Appointments", "/#features"],
      ["Dental chart", "/#features"],
      ["Billing & Receipts", "/#features"],
      ["Reports", "/#features"],
    ],
  },
  {
    h: "Company",
    items: [
      ["About", "#"],
      ["Contact", "mailto:hello@avasmartdental.ph"],
      ["Privacy", "#"],
      ["Terms", "#"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Logo size="lg" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-fg-muted">
              Ava Smart Dental is a subscription-based clinic management system
              designed for Filipino dentists. Built locally in the Philippines.
            </p>
            <p className="mt-6 text-xs text-fg-subtle">
              Manila · Cebu · Davao
              <br />
              hello@avasmartdental.ph
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.h} className="lg:col-span-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                {c.h}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {c.items.map(([label, href]) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-fg-2 transition-colors hover:text-brand-600"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-1" />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Ava Smart Dental. All rights reserved.</p>
          <p className="inline-flex items-center gap-2">
            <span aria-hidden>🇵🇭</span> Made in the Philippines for Filipino clinics.
          </p>
        </div>
      </div>
    </footer>
  );
}
