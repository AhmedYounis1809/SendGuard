export type Language = "en" | "ar";

export interface TranslationDictionary {
  app: {
    badge: string;
    title: string;
    subtitle: string;
  };
  nav: {
    settings: string;
    back: string;
    verify: string;
  };
  landing: {
    problem: string;
    solution: string;
    ctaButton: string;
  };
  drawer: {
    title: string;
    phoneLabel: string;
    phoneHint: string;
    nextButton: string;
    changeNumberButton: string;
    close: string;
  };
  settings: {
    title: string;
    description: string;
    languageLabel: string;
    languages: {
      en: string;
      ar: string;
    };
  };
  verification: {
    title: string;
    description: string;
    phoneNumberNote: string;
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
    };
  };
}
