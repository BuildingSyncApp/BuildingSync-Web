// Test-only resolver hook: `server-only` is a Next.js build-time guard with
// no runtime behaviour. Next resolves it through its bundler, so it does not
// exist as a standalone package for plain `node --test` runs. This synchronous
// hook (registerHooks runs in-thread, ahead of tsx's own resolution) maps any
// import of `server-only` to an empty module so modules under test that mark
// themselves server-only can be imported in tests.
import { registerHooks } from "node:module";

const STUB_URL = "stub:server-only";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: STUB_URL, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === STUB_URL) {
      return { format: "module", source: "export {}", shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
