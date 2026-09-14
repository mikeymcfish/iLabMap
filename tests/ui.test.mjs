import { test } from "node:test";
import assert from "node:assert/strict";
import { api } from "../static/js/api.js";

test("session token is sent on writes, and JSON preserves empty fields and zero values", async () => {
  const requests = [];
  globalThis.fetch = async (path, options) => {
    requests.push({ path, options });
    return {
      ok: true,
      json: async () =>
        path === "/api/session" ? { csrf: "csrf-test" } : { id: 1 },
    };
  };
  await api("/api/session");
  await api("/api/items/1", {
    method: "PATCH",
    body: { description: "", quantity: 0, x_coord_model: 0 },
  });
  assert.equal(requests.length, 2);
  const { options } = requests[1];
  assert.equal(options.headers.get("X-CSRF-Token"), "csrf-test");
  assert.equal(options.credentials, "same-origin");
  assert.deepEqual(JSON.parse(options.body), {
    description: "",
    quantity: 0,
    x_coord_model: 0,
  });
});

test("multipart body is preserved for atomic item and photo submission", async () => {
  let request;
  globalThis.fetch = async (path, options) => {
    request = options;
    return { ok: true, json: async () => ({ id: 2 }) };
  };
  const body = new FormData();
  body.append("payload", JSON.stringify({ name: "Photo tool" }));
  await api("/api/items", { method: "POST", body });
  assert.equal(request.body, body);
  assert.equal(request.headers.get("Content-Type"), null);
});

test("conflict and validation errors are exposed to the user", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ error: "Reload before saving." }),
  });
  await assert.rejects(
    api("/api/items/1", { method: "PATCH", body: { revision: 1 } }),
    (error) =>
      error.status === 409 && error.message === "Reload before saving.",
  );
});

test("non-JSON server failures produce a readable error", async () => {
  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => {
      throw new SyntaxError();
    },
  });
  await assert.rejects(api("/api/items"), /invalid response/);
});
