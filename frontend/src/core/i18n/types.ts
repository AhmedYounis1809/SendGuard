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
  dashboard: {
    title: string;
    description: string;
    placeholder: string;
    trustIndexLabel: string;
    reasonsTitle: string;
    verifyButton: string;
    verifyingButton: string;
    scenarios: {
      legitimate: string;
      false_positive: string;
      suspicious: string;
      high_risk: string;
    };
    scenarioDescriptions: {
      legitimate: string;
      false_positive: string;
      suspicious: string;
      high_risk: string;
    };
    signals: {
      number_verification: string;
      sim_swap: string;
      device_swap: string;
      location_verification: string;
    };
    signalStatus: {
      pass: string;
      fail: string;
      pending: string;
    };
    signalDetails: {
      numberVerified: string;
      numberNotVerified: string;
      noRecentSwap: string;
      recentSwap: string;
      locationNormal: string;
      locationUnusual: string;
    };
    decisions: {
      ALLOW: string;
      ADAPTIVE_VERIFICATION: string;
      TRANSACTION_HOLD: string;
      TEMPORARY_FREEZE: string;
    };
    reasons: {
      numberVerified: string;
      numberVerificationFailed: string;
      knownDevice: string;
      newDevice: string;
      unknownDevice: string;
      normalLocation: string;
      unusualLocation: string;
      normalBehavior: string;
      recentSimChange: string;
      largeAmount: string;
      veryLargeAmount: string;
      verificationSucceeded: string;
      confidenceRecovered: string;
    };
  };
}
