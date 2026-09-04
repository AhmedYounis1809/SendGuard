import type { TranslationDictionary } from "../types";

export const ar: TranslationDictionary = {
  app: {
    badge: "سيند جارد",
    title: "طبقة تنسيق الثقة",
    subtitle: "إشارات كشف احتيال مدعومة بالذكاء الاصطناعي من واجهات CAMARA لشبكات GSMA.",
  },
  nav: {
    menu: "القائمة",
    close: "إغلاق القائمة",
    home: "الرئيسية",
    settings: "الإعدادات",
    verify: "تقييم مخاطر المعاملة",
    dashboard: "لوحة الثقة",
  },
  landing: {
    problem:
      "المحتالون ينتحلون صفة دعم المحافظ والبنوك لخداع الضحايا وسرقة رمز التحقق — البنك يرى المعاملة فقط، ولا يعرف هل تغيّرت الشريحة أو الجهاز اليوم.",
    solution:
      "SendGuard يعمل كطبقة ثقة فوق أي تطبيق محفظة أو بنك، يدمج إشارات شبكة الاتصالات مع سياق المعاملة في قرار واحد فوري.",
    ctaButton: "تشغيل تقييم مخاطر المعاملة",
    dashboardCtaButton: "فتح لوحة الثقة",
  },
  phoneStep: {
    title: "تقييم مخاطر المعاملة",
    phoneLabel: "رقم الموبايل",
    phoneHint: "القيمة الافتراضية رقم اختبار محاكاة نوكيا — غيّره لاختبار رقم آخر.",
    nextButton: "التالي",
    changeNumberButton: "تغيير الرقم",
  },
  settings: {
    title: "الإعدادات",
    description: "اختر اللغة ونمط الألوان المستخدمين في لوحة تحكم SendGuard.",
    languageLabel: "اللغة",
    languages: {
      en: "الإنجليزية",
      ar: "العربية",
    },
    themeLabel: "نمط الألوان",
    themes: {
      sendguard: { name: "SendGuard", description: "الافتراضي — سماوي على كحلي" },
      "royal-navy-gold": { name: "الكحلي الملكي والذهبي", description: "للوكالات المميزة وشركات التمويل" },
      "charcoal-gold": { name: "الفحمي والذهبي الناعم", description: "هوية فاخرة للشركات الناشئة" },
      "amber-navy": { name: "الأسود والذهبي الأنيق", description: "لون مميز جريء وعالي التباين" },
    },
  },
  verification: {
    title: "تقييم مخاطر المعاملة",
    description: "يشغّل التحقق من تبديل الشريحة وتبديل الجهاز والتحقق من الموقع من البداية للنهاية.",
    runButton: "تشغيل التحقق",
    runningButton: "جارٍ التشغيل…",
    statusDone: "تم اجتياز جميع الفحوصات",
    statusError: "فشل أحد الفحوصات",
    placeholder: "$ في انتظار التشغيل…",
    signals: {
      sim_swap: "تبديل الشريحة",
      device_swap: "تبديل الجهاز",
      location_verification: "التحقق من الموقع",
    },
    console: {
      header: "سيند جارد — تقييم مخاطر المعاملة",
      testing: "[{{step}}/{{total}}] اختبار {{name}}...",
      passed: "نجاح",
      failed: "فشل",
      allPassed: "تم اجتياز الفحوصات الثلاث — تم تأكيد عمل الإعداد بالكامل.",
      someFailed: "فشلت بعض الفحوصات — راجع التفاصيل أعلاه.",
      unexpectedError: "فشل التحقق: {{message}}",
      errors: {
        network: "تعذّر الوصول إلى خادم SendGuard على {{apiBase}}. تأكد من أن الخادم يعمل ويمكن الوصول إليه، وأن CORS يسمح بهذا المصدر.",
        timeout: "انتهت مهلة طلب الوكيل بعد {{seconds}} ثانية",
        http: "فشل طلب الوكيل ({{status}}): {{detail}}",
      },
    },
  },
  dashboard: {
    title: "لوحة الثقة",
    description: "اختر معاملة تجريبية لتشغيلها عبر وكيل SendGuard الحي ومشاهدة قراره التدريجي.",
    placeholder: "اختر معاملة تجريبية أعلاه لتشغيلها عبر الوكيل.",
    trustIndexLabel: "مؤشر الثقة",
    reasonsTitle: "السبب",
    decisions: {
      ALLOW: "سماح",
      ADAPTIVE_VERIFICATION: "تحقق تكيّفي",
      TRANSACTION_HOLD: "تعليق المعاملة",
      TEMPORARY_FREEZE: "تجميد مؤقت",
    },
  },
  fallbackChain: {
    title: "مرونة المحرك",
    status: {
      degraded: "متدهور",
      nominal: "طبيعي",
    },
    stage: {
      investigation: "التحقيق",
      recommendation: "التوصية",
    },
    tierState: {
      active: "أنتج النتيجة",
      failed: "فشل — انتقلت السلسلة للمرحلة التالية",
      unused: "لم يتم الوصول إليه",
      bypassed: "تم تخطيه بواسطة السياسة",
    },
    reason: {
      unattributed:
        "تراجعت هذه المرحلة أيضًا، لكن الخادم يُرجع سببًا واحدًا فقط في كل مرة — راجع مرحلة التحقيق أعلاه.",
      causes: {
        rate_limited: "{{service}} تجاوز الحد المسموح به من الطلبات",
        unavailable: "{{service}} غير متاح مؤقتًا بسبب ضغط الطلبات",
        auth: "{{service}} غير مُعدّ بشكل صحيح (مفتاح API مفقود أو غير صالح)",
        timeout: "استغرق {{service}} وقتًا طويلاً للاستجابة",
        not_configured: "{{service}} غير مُهيأ في هذه البيئة",
        unknown: "أعاد {{service}} خطأ غير متوقع",
      },
    },
  },
};
