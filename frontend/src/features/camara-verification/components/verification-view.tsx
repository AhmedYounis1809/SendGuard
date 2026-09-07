import { useState } from "react";
import { useI18n } from "../../../core/i18n";
import { env } from "../../../core/config/env";
import type { AgentTransactionInput } from "../api/agent-test.api";
import { VerificationConsole } from "./verification-console";
import "./verification-flow.css";

type Step = "details" | "console";

const DEFAULT_FORM: AgentTransactionInput = {
  phone_number: env.defaultPhoneNumber || "+99999991000",
  amount: 50000,
  currency: "EGP",
  is_new_beneficiary: true,
  recent_transaction_count_10min: 1,
  usual_latitude: 30.0444,
  usual_longitude: 31.2357,
  location_reference_available: true,
  trusted_device_available: false,
};

interface VerificationViewProps {
  onBack?: () => void;
}

export function VerificationView({ onBack }: VerificationViewProps) {
  const { t } = useI18n();

  const [step, setStep] = useState<Step>("details");

  const [form, setForm] = useState<AgentTransactionInput>(DEFAULT_FORM);

  const [confirmedPayload, setConfirmedPayload] =
    useState<AgentTransactionInput>(DEFAULT_FORM);

  const updateField = <K extends keyof AgentTransactionInput>(
    field: K,
    value: AgentTransactionInput[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    setConfirmedPayload({
      ...form,
    });

    setStep("console");
  };

  const handleBack = () => {
    setStep("details");
  };

  if (step === "console") {
    return (
      <div className="ra-page">
        <div className="ra-topbar">
          <span className="ra-pill ra-pill--accent">
            <span className="ra-pill__dot" />
            {t("phoneStep.engineBadge")}
          </span>
          <span className="ra-pill">{t("phoneStep.stage2ExecutionBadge")}</span>
          <button
            type="button"
            className="ra-btn ra-btn--ghost ra-btn--sm ra-topbar__action"
            onClick={handleBack}
          >
            {t("phoneStep.changeNumberButton")}
          </button>
        </div>

        <VerificationConsole payload={confirmedPayload} onBack={handleBack} />
      </div>
    );
  }

  const recentTxCount = form.recent_transaction_count_10min;

  return (
    <div className="ra-page">
      <div className="ra-topbar">
        <span className="ra-pill ra-pill--accent">
          <span className="ra-pill__dot" />
          {t("phoneStep.engineBadge")}
        </span>
        <span className="ra-pill">{t("phoneStep.signalsBadge")}</span>
        <span className="ra-pill">{t("phoneStep.modeBadge")}</span>
        {onBack && (
          <button
            type="button"
            className="ra-btn ra-btn--ghost ra-btn--sm ra-topbar__action"
            onClick={onBack}
          >
            {t("phoneStep.backButton")}
          </button>
        )}
      </div>

      <div className="ra-card">
        <div className="ra-layout">
          <div>
            <div className="ra-card__header">
              <div>
                <div className="ra-card__heading">
                  <h2>{t("phoneStep.title")}</h2>
                  <span className="ra-stage">{t("common.stage1")}</span>
                </div>
                <p className="ra-card__desc">{t("phoneStep.description")}</p>
              </div>
            </div>

            <div className="ra-section">
              <div className="ra-section__title">
                {t("phoneStep.sectionAttributes")}
              </div>

              <div className="ra-fields">
                <div className="ra-field ra-field--full">
                  <label
                    className="ra-field__label"
                    htmlFor="phone-number-input"
                  >
                    {t("phoneStep.phoneLabel")} (MSISDN)
                  </label>
                  <div className="ra-field__input-row ra-field__input-row--disabled">
                    <input
                      id="phone-number-input"
                      className="ra-input"
                      type="tel"
                      dir="ltr"
                      value={form.phone_number}
                      disabled
                      readOnly
                    />
                    <span className="ra-field__lock" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </span>
                  </div>
                  <div className="ra-field__notice">
                    <svg
                      className="ra-field__notice-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M12 11v5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="12" cy="8" r="1" fill="currentColor" />
                    </svg>
                    <span>{t("phoneStep.phoneHint")}</span>
                  </div>
                </div>

                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="amount-input"
                  >
                    {t("phoneStep.amountLabel")}
                  </label>
                  <div className="ra-field__input-row">
                    <input
                      id="amount-input"
                      className="ra-input"
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(event) =>
                        updateField("amount", Number(event.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="currency-input"
                  >
                    {t("phoneStep.currencyLabel")}
                  </label>
                  <div className="ra-field__input-row">
                    <select
                      id="currency-input"
                      className="ra-input ra-input--select"
                      value={form.currency}
                      onChange={(event) =>
                        updateField("currency", event.target.value)
                      }
                    >
                      <option value="EGP">EGP</option>
                    </select>
                  </div>
                </div>

                <div className="ra-field ra-field--full">
                  <label
                    className="ra-field__label"
                    htmlFor="recent-transactions-input"
                  >
                    {t("phoneStep.recentTxLabel")}
                  </label>
                  <div className="ra-field__input-row">
                    <input
                      id="recent-transactions-input"
                      className="ra-input"
                      type="number"
                      min="0"
                      value={recentTxCount}
                      onChange={(event) =>
                        updateField(
                          "recent_transaction_count_10min",
                          Number(event.target.value),
                        )
                      }
                    />
                    <span className="ra-field__suffix">
                      {recentTxCount === 1
                        ? t("verification.stats.event")
                        : t("verification.stats.events")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ra-section">
              <div className="ra-section__title">{t("phoneStep.sectionGeo")}</div>

              <div className="ra-fields">
                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="latitude-input"
                  >
                    {t("phoneStep.latitudeLabel")}
                  </label>
                  <div className="ra-field__input-row">
                    <input
                      id="latitude-input"
                      className="ra-input"
                      type="number"
                      step="any"
                      value={form.usual_latitude ?? ""}
                      onChange={(event) =>
                        updateField(
                          "usual_latitude",
                          Number(event.target.value),
                        )
                      }
                    />
                    <span className="ra-field__suffix">{t("phoneStep.degN")}</span>
                  </div>
                </div>

                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="longitude-input"
                  >
                    {t("phoneStep.longitudeLabel")}
                  </label>
                  <div className="ra-field__input-row">
                    <input
                      id="longitude-input"
                      className="ra-input"
                      type="number"
                      step="any"
                      value={form.usual_longitude ?? ""}
                      onChange={(event) =>
                        updateField(
                          "usual_longitude",
                          Number(event.target.value),
                        )
                      }
                    />
                    <span className="ra-field__suffix">{t("phoneStep.degE")}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ra-section">
              <div className="ra-section__title">{t("phoneStep.sectionRisk")}</div>

              <div className="ra-fields">
                <div className="ra-field">
                  <span className="ra-field__label">
                    {t("phoneStep.locationRefLabel")}
                  </span>
                  <div className="ra-toggle">
                    <button
                      type="button"
                      className={`ra-toggle__btn ${
                        form.location_reference_available
                          ? "ra-toggle__btn--active-safe"
                          : ""
                      }`}
                      onClick={() =>
                        updateField("location_reference_available", true)
                      }
                    >
                      {t("common.true")}
                    </button>
                    <button
                      type="button"
                      className={`ra-toggle__btn ${
                        !form.location_reference_available
                          ? "ra-toggle__btn--active-warn"
                          : ""
                      }`}
                      onClick={() =>
                        updateField("location_reference_available", false)
                      }
                    >
                      {t("common.false")}
                    </button>
                  </div>
                </div>

                <div className="ra-field">
                  <span className="ra-field__label">{t("phoneStep.newBeneficiaryLabel")}</span>
                  <div className="ra-toggle">
                    <button
                      type="button"
                      className={`ra-toggle__btn ${
                        form.is_new_beneficiary
                          ? "ra-toggle__btn--active-warn"
                          : ""
                      }`}
                      onClick={() => updateField("is_new_beneficiary", true)}
                    >
                      {t("common.true")}
                    </button>
                    <button
                      type="button"
                      className={`ra-toggle__btn ${
                        !form.is_new_beneficiary
                          ? "ra-toggle__btn--active-safe"
                          : ""
                      }`}
                      onClick={() => updateField("is_new_beneficiary", false)}
                    >
                      {t("common.false")}
                    </button>
                  </div>
                </div>

                <div className="ra-field">
                  <span className="ra-field__label">{t("phoneStep.trustedDeviceLabel")}</span>
                  <div className="ra-toggle">
                    <button
                      type="button"
                      className={`ra-toggle__btn ${
                        form.trusted_device_available
                          ? "ra-toggle__btn--active-safe"
                          : ""
                      }`}
                      onClick={() =>
                        updateField("trusted_device_available", true)
                      }
                    >
                      {t("common.true")}
                    </button>
                    <button
                      type="button"
                      className={`ra-toggle__btn ${
                        !form.trusted_device_available
                          ? "ra-toggle__btn--active-warn"
                          : ""
                      }`}
                      onClick={() =>
                        updateField("trusted_device_available", false)
                      }
                    >
                      {t("common.false")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="ra-footer">
              <span className="ra-footnote">
                ✓ {t("phoneStep.handshakeReady")}
              </span>
              <div className="ra-footer__actions">
                {onBack && (
                  <button
                    type="button"
                    className="ra-btn ra-btn--ghost"
                    onClick={onBack}
                  >
                    {t("phoneStep.backButton")}
                  </button>
                )}
                <button
                  type="button"
                  className="ra-btn"
                  onClick={handleNext}
                  disabled={form.phone_number.trim().length === 0}
                >
                  {t("phoneStep.nextButton")}
                </button>
              </div>
            </div>
          </div>

          <aside className="ra-panel">
            <div className="ra-panel__title">
              <span>{t("phoneStep.payloadPreviewTitle")}</span>
              <span className="ra-panel__target">
                {form.phone_number || "—"}
              </span>
            </div>

            <div className="ra-stat-grid">
              <div className="ra-stat">
                <span className="ra-stat__label">{t("verification.stats.amount")}</span>
                <span className="ra-stat__value">
                  {form.amount.toLocaleString()} {form.currency}
                </span>
              </div>
              <div className="ra-stat">
                <span className="ra-stat__label">{t("verification.stats.velocity")}</span>
                <span className="ra-stat__value">
                  {recentTxCount}{" "}
                  {recentTxCount === 1
                    ? t("verification.stats.event")
                    : t("verification.stats.events")}
                </span>
              </div>
              <div className="ra-stat">
                <span className="ra-stat__label">{t("verification.stats.recipient")}</span>
                <span
                  className={`ra-stat__value ${
                    form.is_new_beneficiary
                      ? "ra-stat__value--warn"
                      : "ra-stat__value--safe"
                  }`}
                >
                  {form.is_new_beneficiary
                    ? t("verification.stats.newBeneficiary")
                    : t("verification.stats.knownBeneficiary")}
                </span>
              </div>
              <div className="ra-stat">
                <span className="ra-stat__label">{t("verification.stats.device")}</span>
                <span
                  className={`ra-stat__value ${
                    form.trusted_device_available
                      ? "ra-stat__value--safe"
                      : "ra-stat__value--warn"
                  }`}
                >
                  {form.trusted_device_available
                    ? t("verification.stats.trustedDevice")
                    : t("verification.stats.untrustedDevice")}
                </span>
              </div>
            </div>

            <div className="ra-terminal">
              <div className="ra-terminal__titlebar">
                <span className="ra-terminal__dots">
                  <span className="ra-terminal__dot ra-terminal__dot--red" />
                  <span className="ra-terminal__dot ra-terminal__dot--yellow" />
                  <span className="ra-terminal__dot ra-terminal__dot--green" />
                </span>
                <span className="ra-terminal__title">sendguard-agent</span>
                <span className="ra-terminal__status">{t("phoneStep.terminalIdle")}</span>
              </div>
              <pre className="ra-terminal__body" dir="ltr">
                <span className="ra-terminal__line--placeholder">
                  {t("phoneStep.terminalWaiting")}
                </span>
                {"\n"}
                <span className="ra-terminal__line--header">
                  {"-".repeat(38)}
                </span>
                {"\n"}
                <span>&gt; {t("phoneStep.terminalReadyChecks")}</span>
                {"\n"}
                <span>&gt; {t("phoneStep.terminalReadyDecision")}</span>
              </pre>
            </div>

            <div className="ra-checklist">
              <div className="ra-checklist__head">
                <span>{t("phoneStep.pipelineCoverageTitle")}</span>
                <span className="ra-checklist__count">
                  {t("phoneStep.checksCount", { count: 3 })}
                </span>
              </div>
              <div className="ra-checklist__item">
                <span>{t("verification.signals.sim_swap")}</span>
                <span className="ra-checklist__status">{t("phoneStep.pendingStatus")}</span>
              </div>
              <div className="ra-checklist__item">
                <span>{t("verification.signals.device_swap")}</span>
                <span className="ra-checklist__status">{t("phoneStep.pendingStatus")}</span>
              </div>
              <div className="ra-checklist__item">
                <span>{t("verification.signals.location_verification")}</span>
                <span className="ra-checklist__status">{t("phoneStep.pendingStatus")}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
