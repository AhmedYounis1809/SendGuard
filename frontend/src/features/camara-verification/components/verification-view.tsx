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

export function VerificationView() {
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
            SendGuard Engine
          </span>
          <span className="ra-pill">Stage 2 · Execution</span>
          <button
            type="button"
            className="ra-btn ra-btn--ghost ra-btn--sm ra-topbar__action"
            onClick={handleBack}
          >
            {t("phoneStep.changeNumberButton")}
          </button>
        </div>

        <VerificationConsole payload={confirmedPayload} />
      </div>
    );
  }

  const recentTxCount = form.recent_transaction_count_10min;

  return (
    <div className="ra-page">
      <div className="ra-topbar">
        <span className="ra-pill ra-pill--accent">
          <span className="ra-pill__dot" />
          SendGuard Engine
        </span>
        <span className="ra-pill">Signals: SIM Swap · Device Swap · Location</span>
        <span className="ra-pill">Mode: Simulator Number</span>
      </div>

      <div className="ra-card">
        <div className="ra-layout">
          <div>
            <div className="ra-card__header">
              <div>
                <div className="ra-card__heading">
                  <h2>{t("phoneStep.title")}</h2>
                  <span className="ra-stage">Stage 1</span>
                </div>
                <p className="ra-card__desc">
                  Configure the transaction and security context before
                  running SendGuard verification.
                </p>
              </div>
            </div>

            <div className="ra-section">
              <div className="ra-section__title">
                Subscriber &amp; Transaction Attributes
              </div>

              <div className="ra-fields">
                <div className="ra-field ra-field--full">
                  <label
                    className="ra-field__label"
                    htmlFor="phone-number-input"
                  >
                    {t("phoneStep.phoneLabel")} (MSISDN)
                  </label>
                  <div className="ra-field__input-row">
                    <input
                      id="phone-number-input"
                      className="ra-input"
                      type="tel"
                      dir="ltr"
                      value={form.phone_number}
                      onChange={(event) =>
                        updateField("phone_number", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="amount-input"
                  >
                    Transaction Amount
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
                    Currency
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
                    Transactions in Last 10 Minutes
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
                      event{recentTxCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ra-section">
              <div className="ra-section__title">Geographic Reference</div>

              <div className="ra-fields">
                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="latitude-input"
                  >
                    Usual Latitude
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
                    <span className="ra-field__suffix">deg N</span>
                  </div>
                </div>

                <div className="ra-field">
                  <label
                    className="ra-field__label"
                    htmlFor="longitude-input"
                  >
                    Usual Longitude
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
                    <span className="ra-field__suffix">deg E</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="ra-section">
              <div className="ra-section__title">Risk Signals</div>

              <div className="ra-fields">
                <div className="ra-field">
                  <span className="ra-field__label">
                    Location Reference Available
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
                      True
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
                      False
                    </button>
                  </div>
                </div>

                <div className="ra-field">
                  <span className="ra-field__label">New Beneficiary</span>
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
                      True
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
                      False
                    </button>
                  </div>
                </div>

                <div className="ra-field">
                  <span className="ra-field__label">Trusted Device</span>
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
                      True
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
                      False
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="ra-footer">
              <span className="ra-footnote">
                ✓ CAMARA OpenGateway handshake ready
              </span>
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

          <aside className="ra-panel">
            <div className="ra-panel__title">
              <span>Payload Preview</span>
              <span className="ra-panel__target">
                {form.phone_number || "—"}
              </span>
            </div>

            <div className="ra-stat-grid">
              <div className="ra-stat">
                <span className="ra-stat__label">Amount</span>
                <span className="ra-stat__value">
                  {form.amount.toLocaleString()} {form.currency}
                </span>
              </div>
              <div className="ra-stat">
                <span className="ra-stat__label">Velocity (10m)</span>
                <span className="ra-stat__value">
                  {recentTxCount} event{recentTxCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="ra-stat">
                <span className="ra-stat__label">Recipient</span>
                <span
                  className={`ra-stat__value ${
                    form.is_new_beneficiary
                      ? "ra-stat__value--warn"
                      : "ra-stat__value--safe"
                  }`}
                >
                  {form.is_new_beneficiary
                    ? "New Beneficiary"
                    : "Known Beneficiary"}
                </span>
              </div>
              <div className="ra-stat">
                <span className="ra-stat__label">Device</span>
                <span
                  className={`ra-stat__value ${
                    form.trusted_device_available
                      ? "ra-stat__value--safe"
                      : "ra-stat__value--warn"
                  }`}
                >
                  {form.trusted_device_available
                    ? "Trusted Device"
                    : "Untrusted Device"}
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
                <span className="ra-terminal__status">Idle</span>
              </div>
              <pre className="ra-terminal__body" dir="ltr">
                <span className="ra-terminal__line--placeholder">
                  $ waiting for execution trigger…
                </span>
                {"\n"}
                <span className="ra-terminal__line--header">
                  {"-".repeat(38)}
                </span>
                {"\n"}
                <span>&gt; Ready to check SIM Swap, Device Swap, Location</span>
                {"\n"}
                <span>&gt; Trust decision via Gemini, Groq fallback chain</span>
              </pre>
            </div>

            <div className="ra-checklist">
              <div className="ra-checklist__head">
                <span>Pipeline Coverage</span>
                <span className="ra-checklist__count">3 checks</span>
              </div>
              <div className="ra-checklist__item">
                <span>SIM Swap</span>
                <span className="ra-checklist__status">Pending</span>
              </div>
              <div className="ra-checklist__item">
                <span>Device Swap</span>
                <span className="ra-checklist__status">Pending</span>
              </div>
              <div className="ra-checklist__item">
                <span>Location Verification</span>
                <span className="ra-checklist__status">Pending</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
