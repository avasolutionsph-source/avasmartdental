import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextPayClient } from "../../../supabase/functions/_shared/nextpayClient";

const OK = {
  id: "pi_123",
  status: "pending",
  amount: 149900,
  expires_at: "2026-07-19T12:15:00Z",
  payment_instrument: {
    id: "pm_456",
    actions: [
      {
        action_kind: "qr.present",
        client_instructions: {
          qrph_string: "00020101021228",
          qrph_base64_string: "aGVsbG8=",
        },
      },
    ],
  },
};

describe("NextPayClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(OK), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends HTTP Basic auth built from client id and secret", async () => {
    const c = new NextPayClient("pk_test_abc", "shh");
    await c.createPaymentIntent({
      accountId: "acct_1",
      externalId: "inv-1",
      amountCentavos: 149900,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(
      "Basic " + btoa("pk_test_abc:shh"),
    );
  });

  it("posts the documented body shape in centavos", async () => {
    const c = new NextPayClient("pk_test_abc", "shh");
    await c.createPaymentIntent({
      accountId: "acct_1",
      externalId: "inv-1",
      amountCentavos: 149900,
      metadata: { invoice_id: "abc" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.partners.nextpay.world/v2/payment-intents");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Idempotency-Key"]).toBe("pi-inv-1");
    expect(JSON.parse(init.body)).toEqual({
      account_id: "acct_1",
      external_id: "inv-1",
      amount: 149900,
      currency: "PHP/2",
      expires_in_seconds: 900,
      payment_instrument_options: {
        method_type: "qrph_p2m_reference",
        method_provider: "automatic",
      },
      metadata: { invoice_id: "abc" },
    });
  });

  it("pulls the QR out of the qr.present action", async () => {
    const c = new NextPayClient("pk_test_abc", "shh");
    const r = await c.createPaymentIntent({
      accountId: "acct_1",
      externalId: "inv-1",
      amountCentavos: 149900,
    });
    expect(r.qrString).toBe("00020101021228");
    expect(r.qrImageDataUrl).toBe("data:image/png;base64,aGVsbG8=");
    expect(r.instrumentId).toBe("pm_456");
  });

  it("throws NextPayError carrying the status code", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "bad key" }), { status: 401 }),
    );
    const c = new NextPayClient("ck_wrong", "shh");
    await expect(
      c.createPaymentIntent({
        accountId: "a",
        externalId: "b",
        amountCentavos: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("requires both credentials", () => {
    expect(() => new NextPayClient("", "shh")).toThrow(/required/);
  });
});
