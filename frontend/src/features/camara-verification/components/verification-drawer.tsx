import { useState } from "react";
import { useI18n } from "../../../core/i18n";
import { env } from "../../../core/config/env";
import { VerificationConsole } from "./verification-console";
import "./verification-drawer.css";

interface VerificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

type Step = "phone" | "console";

export function VerificationDrawer({ open, onClose }: VerificationDrawerProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState(env.defaultPhoneNumber);
  const [confirmedNumber, setConfirmedNumber] = useState(env.defaultPhoneNumber);

  const handleNext = () => {
    setConfirmedNumber(phoneNumber);
    setStep("console");
  };

  return (
    <>
      <div
        className={`verification-drawer__backdrop ${open ? "verification-drawer__backdrop--open" : ""}`}
        onClick={onClose}
      />
      <aside
        className={`verification-drawer ${open ? "verification-drawer--open" : ""}`}
        aria-hidden={!open}
      >
        <header className="verification-drawer__header">
          <h2>{t("drawer.title")}</h2>
          <button
            type="button"
            className="verification-drawer__close"
            onClick={onClose}
            aria-label={t("drawer.close")}
          >
            ×
          </button>
        </header>

        <div className="verification-drawer__body">
          {step === "phone" ? (
            <div className="verification-drawer__phone-step">
              <label className="verification-drawer__label" htmlFor="phone-number-input">
                {t("drawer.phoneLabel")}
              </label>
              <input
                id="phone-number-input"
                className="verification-drawer__input"
                type="tel"
                dir="ltr"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              <p className="verification-drawer__hint">{t("drawer.phoneHint")}</p>
              <button
                type="button"
                className="verification-drawer__next-btn"
                onClick={handleNext}
                disabled={phoneNumber.trim().length === 0}
              >
                {t("drawer.nextButton")}
              </button>
            </div>
          ) : (
            <div className="verification-drawer__console-step">
              <button
                type="button"
                className="verification-drawer__change-btn"
                onClick={() => setStep("phone")}
              >
                {t("drawer.changeNumberButton")}
              </button>
              <VerificationConsole phoneNumber={confirmedNumber} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
