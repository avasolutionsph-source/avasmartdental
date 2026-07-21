import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { plans } from "./plans";

/**
 * The charging authority is public.billing_plans (0004_billing.sql). The
 * marketing page keeps its own copy for layout reasons, so this test asserts
 * the two never drift. Guide §7 rule 1 — a stale duplicate once meant a
 * customer would have been charged ₱8,500 over the advertised price.
 */
function migrationPrices(): Record<string, number> {
  const sql = readFileSync(
    resolve(__dirname, "../../../supabase/migrations/0004_billing.sql"),
    "utf8",
  );
  const out: Record<string, number> = {};
  const re = /\('([a-z]+)',\s*'[^']*',\s*(\d+),/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) out[m[1]] = Number(m[2]);
  return out;
}

describe("plan prices", () => {
  const fromSql = migrationPrices();

  it("parses every plan out of the migration", () => {
    expect(Object.keys(fromSql).sort()).toEqual([
      "clinic",
      "multibranch",
      "solo",
    ]);
  });

  it.each(plans)("$id display price matches billing_plans", (plan) => {
    expect(fromSql[plan.id]).toBe(plan.price * 100);
  });
});
