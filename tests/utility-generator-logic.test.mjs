import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPassword,
  buildRandomString,
  formatPassphrase,
  formatWordUsername,
  getGeneratorStrength,
  toggleCharacterOption,
} from "../src/app/utilities/generatorLogic.ts";

const cyclingRandom = () => {
  let value = 0;
  return (upperBound) => value++ % upperBound;
};

test("passwords include every enabled set and preserve requested length", () => {
  const password = buildPassword(
    18,
    { uppercase: true, lowercase: true, numbers: true, special: true },
    cyclingRandom(),
  );
  assert.equal(password.length, 18);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[a-z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^A-Za-z0-9]/);
});

test("random strings use only enabled sets", () => {
  const value = buildRandomString(
    24,
    { uppercase: false, lowercase: true, numbers: true, special: false },
    cyclingRandom(),
  );
  assert.equal(value.length, 24);
  assert.match(value, /^[a-z0-9]+$/);
});

test("the last character set cannot be disabled", () => {
  const result = toggleCharacterOption(
    { uppercase: false, lowercase: true, numbers: false, special: false },
    "lowercase",
  );
  assert.equal(result.blocked, true);
  assert.equal(result.options.lowercase, true);
});

test("passphrase and readable username formatting is deterministic", () => {
  assert.equal(formatPassphrase(["quiet", "river", "ember"], ".", true, true, () => 7), "Quiet.River.Ember.7");
  assert.equal(formatWordUsername(["silent", "otter"], "-", false, true, () => 42), "silent-otter-42");
});

test("generator strength labels rise with length and variety", () => {
  assert.deepEqual(getGeneratorStrength(8, 1), { label: "Basic", level: 1 });
  assert.deepEqual(getGeneratorStrength(14, 4), { label: "Strong", level: 3 });
  assert.deepEqual(getGeneratorStrength(24, 4), { label: "Excellent", level: 4 });
});
