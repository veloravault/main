import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("import preview uses real service logo assets", () => {
  const features = read("src/components/dreelio/Features.tsx");

  assert.match(features, /assets\.nflxext\.com\/.*nficon2016\.png/);
  assert.match(features, /Spotify_Primary_Logo_RGB_Green\.png/);
  assert.match(features, /amazon\.com\/favicon\.ico/);
  assert.doesNotMatch(features, /function (?:Netflix|Spotify|Amazon)Logo/);
});

test("footer payment marks are downloaded image assets, never hand-drawn markup", () => {
  const badges = read("src/components/dreelio/PaymentBadges.tsx");
  const css = read("src/components/dreelio/PaymentBadges.module.css");
  for (const network of ["visa", "mastercard", "rupay", "upi"]) {
    const path = `public/payment-logos/${network}.svg`;
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), true, `${path} must exist`);
    assert.match(badges, new RegExp(`/payment-logos/${network}\\.svg`));
  }
  assert.match(badges, /from "next\/image"/);
  assert.doesNotMatch(badges, /<svg|<circle|VISA<|>RuPay<|>UPI</);
  assert.doesNotMatch(css, /Georgia|Times New Roman|\.visa\s*\{/);
  assert.match(badges, /Net banking via Razorpay/);
});
