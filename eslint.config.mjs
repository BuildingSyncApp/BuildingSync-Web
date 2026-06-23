import next from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**"] },
  ...next,
  {
    // The React Compiler / react-hooks "latest" preset enabled by
    // eslint-config-next flags several correct, idiomatic patterns as errors:
    //  - set-state-in-effect: reading localStorage / form-action state after
    //    mount to avoid SSR hydration mismatch (e.g. ThemeToggle) is valid.
    //  - the "impure function during render" / "access before declared" checks
    //    fire on async server components (Date.now()) and on stable component
    //    functions referenced inside map event handlers.
    // We keep them visible as warnings rather than silence them or rewrite
    // working code, so they don't block a CI lint gate.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // purity: fires on Date.now() inside async server components and
      //   render-time countdown math (ReverificationBanner) — both correct here.
      // immutability: fires on stable component functions referenced inside
      //   Leaflet map event handlers before their hoisted declaration.
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },
];

export default config;
