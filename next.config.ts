import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default (phase: string): NextConfig => ({
  // Static export: `next build` writes a plain HTML/JS/CSS site to `out/`.
  output: "export",
  // Relative asset paths let the export be hosted under any sub-path. The dev
  // server can't hydrate with a relative prefix, so only apply it to builds.
  assetPrefix: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "./",
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
});
