import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { plans } from "./plans";

/**
 * The charging authority is public.billing_plans, seeded by
 * 0011_pricing_tiers.sql. The marketing page keeps its own copy for layout
 * reasons, so this test asserts the two never drift. Guide §7 rule 1 — a
 * stale duplicate once meant a customer would have been charged ₱8,500 over
 * the advertised price.
 */
const MIGRATION_PATH = resolve(
  __dirname,
  "../../../supabase/migrations/0011_pricing_tiers.sql",
);

type TierRow = {
  monthly_centavos: number | null;
  annual_centavos: number | null;
};

function migrationTiers(sql: string): Record<string, TierRow> {
  const out: Record<string, TierRow> = {};
  // Matches rows from the `values (...)` list inserted into billing_plans:
  //   ('tier_1',    '1 clinic',    1, 1,    69900,  700000,  69900,  true),
  // Groups: id, monthly_centavos, annual_centavos (both may be `null`).
  const re =
    /\('([a-z0-9_]+)',\s*'[^']*',\s*(?:\d+|null),\s*(?:\d+|null),\s*(\d+|null),\s*(\d+|null),/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    out[m[1]] = {
      monthly_centavos: m[2] === "null" ? null : Number(m[2]),
      annual_centavos: m[3] === "null" ? null : Number(m[3]),
    };
  }
  return out;
}

describe("plan prices", () => {
  const fromSql = migrationTiers(readFileSync(MIGRATION_PATH, "utf8"));

  it("parses every tier out of the migration", () => {
    expect(Object.keys(fromSql).sort()).toEqual([
      "tier_1",
      "tier_2_6",
      "tier_6plus",
    ]);
  });

  it.each(plans)(
    "$id monthly + annual display price matches billing_plans",
    (plan) => {
      const tier = fromSql[plan.id];
      expect(tier).toBeDefined();

      if (plan.price === null) {
        expect(tier.monthly_centavos).toBeNull();
      } else {
        expect(tier.monthly_centavos).toBe(plan.price * 100);
      }

      if (plan.annualPrice === null) {
        expect(tier.annual_centavos).toBeNull();
      } else {
        expect(tier.annual_centavos).toBe(plan.annualPrice * 100);
      }
    },
  );

  it("tier_6plus is request-priced (null monthly and annual)", () => {
    const tier6plus = plans.find((p) => p.id === "tier_6plus")!;
    expect(tier6plus.price).toBeNull();
    expect(tier6plus.annualPrice).toBeNull();
    expect(fromSql.tier_6plus.monthly_centavos).toBeNull();
    expect(fromSql.tier_6plus.annual_centavos).toBeNull();
  });
});
