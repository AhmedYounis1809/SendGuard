import { useState } from "react";
import { useI18n } from "../../../core/i18n";
import { env } from "../../../core/config/env";
import { VerificationConsole } from "./verification-console";
import "./verification-view.css";

type Step = "phone" | "console";

export function VerificationView() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState(env.defaultPhoneNumber);
  const [confirmedNumber, setConfirmedNumber] = useState(env.defaultPhoneNumber);

  const handleNext = () => {
    setConfirmedNumber(phoneNumber);
    setStep("console");
  };

  if (step === "phone") {
    return (
      <div className="phone-step">
        <h2>{t("phoneStep.title")}</h2>
        <label className="phone-step__label" htmlFor="phone-number-input">
          {t("phoneStep.phoneLabel")}
        </label>
        <input
          id="phone-number-input"
          className="phone-step__input"
          type="tel"
          dir="ltr"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
        />
        <p className="phone-step__hint">{t("phoneStep.phoneHint")}</p>
        <button
          type="button"
          className="phone-step__next-btn"
          onClick={handleNext}
          disabled={phoneNumber.trim().length === 0}
        >
          {t("phoneStep.nextButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="verification-view__console-step">
      <button type="button" className="phone-step__change-btn" onClick={() => setStep("phone")}>
        {t("phoneStep.changeNumberButton")}
      </button>
      <VerificationConsole phoneNumber={confirmedNumber} />
    </div>
  );
}
