import assert from "node:assert/strict";
import test from "node:test";

import { parseWranglerD1Json } from "../seed/d1-cli.js";

test("keeps one D1 result set per batched SQL statement", () => {
  const result = parseWranglerD1Json<{ count: number }>(
    JSON.stringify([
      { success: true, results: [{ count: 3 }] },
      { success: true, results: [{ count: 5 }] },
    ]),
    2,
  );

  assert.deepEqual(result, [[{ count: 3 }], [{ count: 5 }]]);
});

test("rejects a partial Wrangler JSON response", () => {
  assert.throws(
    () =>
      parseWranglerD1Json(JSON.stringify([{ success: true, results: [] }]), 2),
    /expected 2/,
  );
});
