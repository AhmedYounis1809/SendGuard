export type Language = "en" | "ar";

export interface TranslationDictionary {
  app: {
    badge: string;
    title: string;
    subtitle: string;
  };
  nav: {
    menu: string;
    close: string;
    home: string;
    settings: string;
    verify: string;
    dashboard: string;
  };
  landing: {
    problem: string;
    solution: string;
    ctaButton: string;
    dashboardCtaButton: string;
  };
  phoneStep: {
    title: string;
    phoneLabel: string;
    phoneHint: string;
    nextButton: string;
    changeNumberButton: string;
  };
  settings: {
    title: string;
    description: string;
    languageLabel: string;
    languages: {
      en: string;
      ar: string;
    };
    themeLabel: string;
    themes: {
      sendguard: { name: string; description: string };
      "royal-navy-gold": { name: string; description: string };
      "charcoal-gold": { name: string; description: string };
      "amber-navy": { name: string; description: string };
    };
  };
  verification: {
    title: string;
    description: string;
    runButton: string;
    runningButton: string;
    statusDone: string;
    statusError: string;
    placeholder: string;
    signals: {
      sim_swap: string;
      device_swap: string;
      location_verification: string;
    };
    console: {
      header: string;
      testing: string;
      passed: string;
      failed: string;
      allPassed: string;
      someFailed: string;
      unexpectedError: string;
      errors: {
        network: string;
        timeout: string;
        http: string;
      };
    };
  };
  dashboard: {
    title: string;
    description: string;
    placeholder: string;
    trustIndexLabel: string;
    reasonsTitle: string;
    decisions: {
      ALLOW: string;
      ADAPTIVE_VERIFICATION: string;
      TRANSACTION_HOLD: string;
      TEMPORARY_FREEZE: string;
    };
  };
  fallbackChain: {
    title: string;
    status: {
      degraded: string;
      nominal: string;
    };
    stage: {
      investigation: string;
      recommendation: string;
    };
    tierState: {
      active: string;
      failed: string;
      unused: string;
      bypassed: string;
    };
    reason: {
      unattributed: string;
      causes: {
        rate_limited: string;
        unavailable: string;
        auth: string;
        timeout: string;
        not_configured: string;
        unknown: string;
      };
    };
  };
}
