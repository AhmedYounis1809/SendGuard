import type { TranslationDictionary } from "../types";

export const en: TranslationDictionary = {
  app: {
    badge: "SendGuard",
    title: "Trust Orchestration Layer",
    subtitle: "AI-powered fraud signals from GSMA CAMARA network APIs.",
  },
  nav: {
    settings: "Settings",
    back: "Back",
  },
  settings: {
    title: "Settings",
    description: "Choose the language used across the SendGuard dashboard.",
    languageLabel: "Language",
    languages: {
      en: "English",
      ar: "Arabic",
    },
  },
  verification: {
    title: "CAMARA API Verification",
    description:
      "Runs SIM Swap, Device Swap, and Location Verification against the Nokia simulator number end-to-end.",
    runButton: "Run Verification",
    runningButton: "Running…",
    statusDone: "All checks passed",
    statusError: "Check failed",
    placeholder: "$ waiting to run…",
    signals: {
      sim_swap: "SIM Swap",
      device_swap: "Device Swap",
      location_verification: "Location Verification",
    },
    console: {
      header: "SendGuard — CAMARA API Verification",
      testing: "[{{step}}/{{total}}] Testing {{name}}...",
      passed: "PASSED",
      failed: "FAILED",
      allPassed: "All 3 checks PASSED — setup confirmed working end-to-end.",
      someFailed: "Some checks FAILED — see details above.",
      unexpectedError: "Verification failed: {{message}}",
    },
  },
};
