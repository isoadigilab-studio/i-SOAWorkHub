import { describe, expect, it } from "vitest";
import { opportunitySchema, registerSchema, safeUrl, portfolioSchema } from "../../lib/validations";
import { safeNext, slugify, cleanSearch, formatMoney } from "../../lib/utils";

describe("registerSchema", () => {
  it("accepts a valid freelancer", () => {
    const r = registerSchema.safeParse({ full_name: "Rina A", email: "A@Example.com", password: "longenough1", role: "freelancer" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("a@example.com");
  });
  it("rejects admin role from the public form", () => {
    expect(registerSchema.safeParse({ full_name: "X Y", email: "a@b.co", password: "longenough1", role: "admin" }).success).toBe(false);
  });
  it("rejects short passwords", () => {
    expect(registerSchema.safeParse({ full_name: "X Y", email: "a@b.co", password: "short", role: "client" }).success).toBe(false);
  });
});

describe("URLs", () => {
  it("blocks javascript: and data: schemes", () => {
    expect(portfolioSchema.safeParse({ title: "x1", url: "javascript:alert(1)" }).success).toBe(false);
    expect(safeUrl.safeParse("data:text/html,hi").success).toBe(false);
  });
  it("accepts https", () => {
    expect(portfolioSchema.safeParse({ title: "Site", url: "https://example.com/a" }).success).toBe(true);
  });
});

describe("opportunitySchema", () => {
  const base = {
    title: "Logo design project",
    description: "A".repeat(40),
    category_id: "123e4567-e89b-12d3-a456-426614174000",
    opportunity_type: "freelance",
    work_mode: "remote",
    currency: "USD",
    skills: "figma, Illustrator",
    intent: "submit",
  };
  it("parses skills and optional numbers", () => {
    const r = opportunitySchema.safeParse({ ...base, budget_min: "", budget_max: "100" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.skills).toEqual(["figma", "illustrator"]);
      expect(r.data.budget_min).toBeUndefined();
      expect(r.data.budget_max).toBe(100);
    }
  });
  it("rejects min > max", () => {
    expect(opportunitySchema.safeParse({ ...base, budget_min: "500", budget_max: "100" }).success).toBe(false);
  });
});

describe("utils", () => {
  it("only allows relative redirects", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/\\evil.com")).toBe("/dashboard");
  });
  it("slugifies accents", () => {
    expect(slugify("Développeur Web !")).toBe("developpeur-web");
  });
  it("cleans search input for PostgREST filters", () => {
    expect(cleanSearch("a,b(c)%")).toBe("a b c");
  });
  it("formats money ranges", () => {
    expect(formatMoney(10, 20, "USD")).toBe("10–20 USD");
    expect(formatMoney(null, null)).toBeNull();
  });
});
