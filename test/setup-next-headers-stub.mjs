// Test-only stub for `next/headers` `cookies()`. The auth server actions set
// and read the session cookie via next/headers, which throws outside a Next
// request scope. This hook replaces `next/headers` with an in-memory cookie
// jar so the actions can run in `node --test`, and the test can assert what
// they wrote to the session cookie.
//
// Loaded alongside the server-only stub (both via --import).
import { registerHooks } from "node:module";

const STUB_URL = "stub:next-headers";

const stubSource = `
const store = new Map();
globalThis.__TEST_COOKIE_JAR__ = store;
export async function cookies() {
  return {
    get(name) {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set(name, value) {
      // Supports both (name, value, opts) and ({ name, value, ... }) shapes.
      if (typeof name === "object" && name !== null) {
        store.set(name.name, name.value);
      } else {
        store.set(name, value);
      }
    },
    delete(name) { store.delete(name); },
  };
}
export async function headers() {
  return new Headers();
}
`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/headers") {
      return { url: STUB_URL, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === STUB_URL) {
      return { format: "module", source: stubSource, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
