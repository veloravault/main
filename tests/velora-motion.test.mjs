import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const MOTION_COMPONENTS = [
  "Nav",
  "Hero",
  "Devices",
  "FeatureSplit",
  "Features",
  "Highlights",
  "SecurityArchitecture",
  "Pricing",
  "FinalCTA",
  "Footer",
];

test("landing motion foundation centralizes restrained motion tokens", () => {
  const motionPath = "src/components/velora/motion.ts";
  const parallaxPath = "src/components/velora/ParallaxMedia.tsx";

  assert.equal(exists(motionPath), true, "missing shared landing motion tokens");
  assert.equal(exists(parallaxPath), true, "missing parallax media component");

  const motion = read(motionPath);
  const parallax = read(parallaxPath);

  for (const token of [
    "APPLE_EASE",
    "LANDING_VIEWPORT",
    "revealVariants",
    "fadeScaleVariants",
    "staggerContainer",
    "staggerItem",
    "HOVER_LIFT",
    "TAP_PRESS",
  ]) {
    assert.match(motion, new RegExp(`export const ${token}`));
  }

  assert.match(motion, /import type \{ Variants \} from "framer-motion"/);
  assert.match(parallax, /useReducedMotion/);
  assert.match(parallax, /useScroll/);
  assert.match(parallax, /useTransform/);
  assert.match(parallax, /reduceMotion \? 0 : y/);
  assert.equal(exists("src/components/velora/VaultSeal.tsx"), true, "missing Velora vault seal");
  assert.match(read("src/components/velora/VaultSeal.tsx"), /useReducedMotion/);
});

test("every landing section uses the shared motion language and reduced motion", () => {
  for (const component of MOTION_COMPONENTS) {
    const source = read(`src/components/velora/${component}.tsx`);
    assert.match(source, /^"use client";/, `${component} must be a client motion boundary`);
    assert.match(
      source,
      /from "\.\/motion"|from "\.\/ParallaxMedia"/,
      `${component} must use shared landing motion`,
    );
    assert.match(source, /useReducedMotion/, `${component} must respect reduced motion`);
  }
});

test("landing interactions stay restrained", () => {
  const motionPath = "src/components/velora/motion.ts";
  assert.equal(exists(motionPath), true, "missing shared landing motion tokens");
  const motion = read(motionPath);

  assert.match(motion, /y: -4/);
  assert.match(motion, /scale: 1\.01/);
  assert.match(motion, /scale: 0\.985/);
  assert.doesNotMatch(motion, /repeat:\s*Infinity/);
});
