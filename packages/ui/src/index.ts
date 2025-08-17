// packages/ui/src/index.ts

export * from "./components/Button.js";
export * from "./components/Spinner.js";

// If you later re-enable other exports, also include .js
// export * from "./Form.js";
// export * from "./Card.js";
// export * from "./Modal.js";
// export * from "./theme.js";
// export * from "./hooks.js";
// export * from "./types.js";

declare global {
  interface Window {
    OurHeritageUI?: {
      version: string;
    };
  }
}

export const version = process.env.UI_VERSION || '0.1.0';

if (typeof window !== 'undefined') {
  window.OurHeritageUI = window.OurHeritageUI || {
    version,
  };
  console.info(`[OurHeritageUI] Initialized - v${version}`);
}
