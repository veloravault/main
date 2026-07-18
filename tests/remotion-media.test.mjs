import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

test("Remotion walkthrough is pinned, deterministic, and renderable", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.devDependencies.remotion, "4.0.490");
  assert.equal(packageJson.devDependencies["@remotion/cli"], "4.0.490");
  assert.equal(packageJson.devDependencies.zod, "4.3.6");
  assert.match(packageJson.scripts["media:studio"], /remotion studio remotion\/index\.ts/);
  assert.match(packageJson.scripts["media:render"], /VeloraVaultWalkthrough/);
  assert.match(packageJson.scripts["media:render"], /velora-vault-walkthrough\.mp4/);
  assert.match(packageJson.scripts["media:render"], /--muted/);
  assert.match(packageJson.scripts["media:poster"], /velora-vault-walkthrough-poster\.png/);

  for (const path of [
    "remotion/index.ts",
    "remotion/Root.tsx",
    "remotion/VeloraVaultWalkthrough.tsx",
    "remotion/VeloraVaultWalkthrough.module.css",
  ]) {
    assert.equal(exists(path), true, `missing ${path}`);
  }

  const root = read("remotion/Root.tsx");
  assert.match(root, /id="VeloraVaultWalkthrough"/);
  assert.match(root, /durationInFrames=\{270\}/);
  assert.match(root, /fps=\{30\}/);
  assert.match(root, /width=\{1280\}/);
  assert.match(root, /height=\{900\}/);

  const composition = read("remotion/VeloraVaultWalkthrough.tsx");
  for (const variant of ["overview", "passwords", "documents", "wallet"]) {
    assert.match(composition, new RegExp(`variant=\\"${variant}\\"`));
  }
  assert.match(composition, /Sequence/);
  assert.match(composition, /spring/);

  const combined = [root, composition].join("\n");
  assert.doesNotMatch(combined, /fetch\(|localStorage|sessionStorage|navigator\.credentials|rzp_|Sakshi/i);

  const preview = read("src/components/dreelio/VeloraProductPreview.tsx");
  assert.doesNotMatch(preview, /from "\.\/VeloraBrand"|from "next\/image"|from "@\//);
});
