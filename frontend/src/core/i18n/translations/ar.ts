import type { TranslationDictionary } from "../types";

export const ar: TranslationDictionary = {
  app: {
    badge: "سيند جارد",
    title: "طبقة تنسيق الثقة",
    subtitle: "إشارات كشف احتيال مدعومة بالذكاء الاصطناعي من واجهات CAMARA لشبكات GSMA.",
  },
  nav: {
    settings: "الإعدادات",
    back: "رجوع",
  },
  settings: {
    title: "الإعدادات",
    description: "اختر اللغة المستخدمة في لوحة تحكم SendGuard.",
    languageLabel: "اللغة",
    languages: {
      en: "الإنجليزية",
      ar: "العربية",
    },
  },
  verification: {
    title: "التحقق من واجهات CAMARA",
    description:
      "يشغّل التحقق من تبديل الشريحة وتبديل الجهاز والتحقق من الموقع مقابل رقم محاكاة نوكيا من البداية إلى النهاية.",
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
      header: "سيند جارد — التحقق من واجهات CAMARA",
      testing: "[{{step}}/{{total}}] اختبار {{name}}...",
      passed: "نجاح",
      failed: "فشل",
      allPassed: "تم اجتياز الفحوصات الثلاث — تم تأكيد عمل الإعداد بالكامل.",
      someFailed: "فشلت بعض الفحوصات — راجع التفاصيل أعلاه.",
      unexpectedError: "فشل التحقق: {{message}}",
    },
  },
};
