import { useState } from "react";
import { useI18n } from "../../../core/i18n";
import { env } from "../../../core/config/env";
import type { AgentTransactionInput } from "../api/agent-test.api";
import { VerificationConsole } from "./verification-console";
import "./verification-view.css";

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

  const [form, setForm] = useState<AgentTransactionInput>(
    DEFAULT_FORM,
  );

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
      <div className="verification-view__console-step">
        <button
          type="button"
          className="phone-step__change-btn"
          onClick={handleBack}
        >
          {t("phoneStep.changeNumberButton")}
        </button>

        <VerificationConsole payload={confirmedPayload} />
      </div>
    );
  }

  return (
    <div className="phone-step">
      <h2>{t("phoneStep.title")}</h2>

      <p className="phone-step__hint">
        Configure the transaction and security context before running
        SendGuard.
      </p>

      {/* Phone Number */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="phone-number-input"
        >
          Phone Number
        </label>

        <input
          id="phone-number-input"
          className="phone-step__input"
          type="tel"
          dir="ltr"
          value={form.phone_number}
          onChange={(event) =>
            updateField(
              "phone_number",
              event.target.value,
            )
          }
        />
      </div>

      {/* Amount */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="amount-input"
        >
          Transaction Amount
        </label>

        <input
          id="amount-input"
          className="phone-step__input"
          type="number"
          min="0"
          value={form.amount}
          onChange={(event) =>
            updateField(
              "amount",
              Number(event.target.value),
            )
          }
        />
      </div>

      {/* Currency */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="currency-input"
        >
          Currency
        </label>

        <select
          id="currency-input"
          className="phone-step__input"
          value={form.currency}
          onChange={(event) =>
            updateField(
              "currency",
              event.target.value,
            )
          }
        >
          <option value="EGP">EGP</option>
        </select>
      </div>

      {/* New Beneficiary */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="beneficiary-input"
        >
          New Beneficiary
        </label>

        <select
          id="beneficiary-input"
          className="phone-step__input"
          value={String(form.is_new_beneficiary)}
          onChange={(event) =>
            updateField(
              "is_new_beneficiary",
              event.target.value === "true",
            )
          }
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </div>

      {/* Recent Transactions */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="recent-transactions-input"
        >
          Transactions in Last 10 Minutes
        </label>

        <input
          id="recent-transactions-input"
          className="phone-step__input"
          type="number"
          min="0"
          value={form.recent_transaction_count_10min}
          onChange={(event) =>
            updateField(
              "recent_transaction_count_10min",
              Number(event.target.value),
            )
          }
        />
      </div>

      {/* Usual Latitude */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="latitude-input"
        >
          Usual Latitude
        </label>

        <input
          id="latitude-input"
          className="phone-step__input"
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
      </div>

      {/* Usual Longitude */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="longitude-input"
        >
          Usual Longitude
        </label>

        <input
          id="longitude-input"
          className="phone-step__input"
          type="number"
          step="any"
          value={form.usual_longitude ?? ""}
          onChange={(event) =>
  updateField(
    "usual_latitude",
    Number(event.target.value),
  )
}
        />
      </div>

      {/* Location Reference */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="location-reference-input"
        >
          Location Reference Available
        </label>

        <select
          id="location-reference-input"
          className="phone-step__input"
          value={String(
            form.location_reference_available,
          )}
          onChange={(event) =>
            updateField(
              "location_reference_available",
              event.target.value === "true",
            )
          }
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </div>

      {/* Trusted Device */}
      <div className="phone-step__field">
        <label
          className="phone-step__label"
          htmlFor="trusted-device-input"
        >
          Trusted Device Available
        </label>

        <select
          id="trusted-device-input"
          className="phone-step__input"
          value={String(
            form.trusted_device_available,
          )}
          onChange={(event) =>
            updateField(
              "trusted_device_available",
              event.target.value === "true",
            )
          }
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </div>

      {/* Next */}
      <button
        type="button"
        className="phone-step__next-btn"
        onClick={handleNext}
        disabled={form.phone_number.trim().length === 0}
      >
        {t("phoneStep.nextButton")}
      </button>
    </div>
  );
}
