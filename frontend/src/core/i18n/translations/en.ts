import type { TranslationDictionary } from "../types";

export const en: TranslationDictionary = {
  app: {
    badge: "SendGuard",
    title: "Trust Orchestration Layer",
    subtitle: "AI-powered fraud signals from GSMA CAMARA network APIs.",
  },
  nav: {
    menu: "Menu",
    close: "Close menu",
    home: "Home",
    settings: "Settings",
    verify: "CAMARA Verification",
  },
  landing: {
    problem:
      "Fraudsters impersonate wallet and bank support to trick victims into handing over OTPs — the bank only sees the transaction, never whether the SIM or device changed today.",
    solution:
      "SendGuard sits on top of any wallet or bank app as a trust layer, fusing telecom network signals with transaction context into one real-time decision.",
    ctaButton: "Run CAMARA Verification",
  },
  phoneStep: {
    title: "CAMARA API Verification",
    phoneLabel: "Mobile Number",
    phoneHint: "Defaults to Nokia's Simulator Mode test number — change it to test another.",
    nextButton: "Next",
    changeNumberButton: "Change Number",
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
    description: "Runs SIM Swap, Device Swap, and Location Verification end-to-end.",
    phoneNumberNote: "Verifying number: {{phoneNumber}}",
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
