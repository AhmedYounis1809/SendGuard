export type Language = "en" | "ar";

export interface TranslationDictionary {
  common: {
    back: string;
    true: string;
    false: string;
    stage1: string;
    stage2: string;
  };
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
    description: string;
    phoneLabel: string;
    phoneHint: string;
    nextButton: string;
    backButton: string;
    changeNumberButton: string;
    engineBadge: string;
    signalsBadge: string;
    modeBadge: string;
    stage2ExecutionBadge: string;
    sectionAttributes: string;
    amountLabel: string;
    currencyLabel: string;
    recentTxLabel: string;
    sectionGeo: string;
    latitudeLabel: string;
    longitudeLabel: string;
    degN: string;
    degE: string;
    sectionRisk: string;
    locationRefLabel: string;
    newBeneficiaryLabel: string;
    trustedDeviceLabel: string;
    handshakeReady: string;
    payloadPreviewTitle: string;
    terminalWaiting: string;
    terminalReadyChecks: string;
    terminalReadyDecision: string;
    terminalIdle: string;
    pipelineCoverageTitle: string;
    checksCount: string;
    pendingStatus: string;
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
      "violet-nightfall": { name: string; description: string };
      "cyan-ember": { name: string; description: string };
      "hanken-teal": { name: string; description: string };
      "emerald-matrix": { name: string; description: string };
      "solar-flare": { name: string; description: string };
    };
  };
  verification: {
    title: string;
    description: string;
    runButton: string;
    runningButton: string;
    statusDone: string;
    statusError: string;
    statusIdle: string;
    placeholder: string;
    payloadManifestTitle: string;
    geoReferenceTitle: string;
    usualLatitude: string;
    usualLongitude: string;
    locationReferenceLabel: string;
    available: string;
    unavailable: string;
    stats: {
      amount: string;
      velocity: string;
      recipient: string;
      device: string;
      newBeneficiary: string;
      knownBeneficiary: string;
      trustedDevice: string;
      untrustedDevice: string;
      event: string;
      events: string;
    };
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
    scenariosCount: string;
    simulateButton: string;
    simulatingButton: string;
    liveAgentBadge: string;
    liveDecisionTitle: string;
    filterAriaLabel: string;
    filters: {
      all: string;
      routine: string;
      friction: string;
      suspicious: string;
    };
    fields: {
      sender: string;
      phone: string;
      recipient: string;
      beneficiary: string;
      recentTx: string;
      location: string;
      device: string;
    };
    values: {
      existing: string;
      new: string;
      trusted: string;
      untrusted: string;
      inLast10Min: string;
    };
    decisions: {
      ALLOW: string;
      ADAPTIVE_VERIFICATION: string;
      TRANSACTION_HOLD: string;
      TEMPORARY_FREEZE: string;
    };
    snackbar: {
      stillSimulating: string;
      viewAction: string;
      dismissAriaLabel: string;
      decisionReady: string;
      simulationFailed: string;
    };
    scenarios: Record<
      | "everyday_transfer"
      | "family_support"
      | "new_device"
      | "new_beneficiary_large"
      | "rapid_transfers"
      | "high_value_no_reference",
      {
        label: string;
        summary: string;
        riskLabel: string;
        locationLabel: string;
        senderName: string;
        recipientName: string;
      }
    >;
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
