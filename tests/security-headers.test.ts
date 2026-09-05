import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const config = readFileSync("next.config.ts", "utf8");

test("Next config defines baseline security headers", () => {
  assert.match(config, /headers:\s*async \(\)/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Referrer-Policy/);
  assert.match(config, /Permissions-Policy/);
  assert.match(config, /X-Frame-Options/);
});

test("production CSP allows only declared third-party integrations", () => {
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /dash\.accessibly\.app/);
  assert.match(config, /www\.youtube\.com/);
  assert.match(config, /frame-src 'self' https:\/\/www\.youtube\.com/);
  assert.match(config, /object-src 'none'/);
});
