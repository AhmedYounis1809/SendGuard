import type { DemoScenario } from "../types/trust-dashboard.types";

// A shared "home" reference point (Cairo) — usual_latitude/usual_longitude
// describe where the sender is normally seen, not their current location.
// The current location comes from the live CAMARA signal for the real
// simulator number, which is identical across every card below; what
// actually varies the agent's decision between scenarios is the
// transaction context (amount, beneficiary, velocity, device, whether a
// location reference is on file at all).
const CAIRO_LAT = 30.0444;
const CAIRO_LNG = 31.2357;

// Display strings (label, summary, risk label, location label, party names)
// are not here — they live in the i18n dictionaries under
// `dashboard.scenarios.<id>` so the dashboard localizes. This file only
// holds the structural/numeric context each card runs against the agent.
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "everyday_transfer",
    category: "routine",
    riskTier: "low",
    sender: { phone: "+20 10 1234 5678", account: "****1234" },
    recipient: { phone: "+20 11 8765 4321", account: "****5678" },
    payload: {
      amount: 500,
      currency: "EGP",
      is_new_beneficiary: false,
      recent_transaction_count_10min: 1,
      usual_latitude: CAIRO_LAT,
      usual_longitude: CAIRO_LNG,
      location_reference_available: true,
      trusted_device_available: true,
    },
  },
  {
    id: "family_support",
    category: "routine",
    riskTier: "low",
    sender: { phone: "+20 12 2233 4455", account: "****2211" },
    recipient: { phone: "+20 10 9988 7766", account: "****3344" },
    payload: {
      amount: 1200,
      currency: "EGP",
      is_new_beneficiary: false,
      recent_transaction_count_10min: 0,
      usual_latitude: CAIRO_LAT,
      usual_longitude: CAIRO_LNG,
      location_reference_available: true,
      trusted_device_available: true,
    },
  },
  {
    id: "new_device",
    category: "friction",
    riskTier: "medium",
    sender: { phone: "+20 15 5566 7788", account: "****7788" },
    recipient: { phone: "+20 11 3344 5566", account: "****9900" },
    payload: {
      amount: 3000,
      currency: "EGP",
      is_new_beneficiary: false,
      recent_transaction_count_10min: 1,
      usual_latitude: CAIRO_LAT,
      usual_longitude: CAIRO_LNG,
      location_reference_available: true,
      trusted_device_available: false,
    },
  },
  {
    id: "new_beneficiary_large",
    category: "friction",
    riskTier: "elevated",
    sender: { phone: "+20 12 6677 8899", account: "****4455" },
    recipient: { phone: "+20 10 1122 3344", account: "****6677" },
    payload: {
      amount: 25000,
      currency: "EGP",
      is_new_beneficiary: true,
      recent_transaction_count_10min: 1,
      usual_latitude: CAIRO_LAT,
      usual_longitude: CAIRO_LNG,
      location_reference_available: true,
      trusted_device_available: false,
    },
  },
  {
    id: "rapid_transfers",
    category: "suspicious",
    riskTier: "high",
    sender: { phone: "+20 11 9900 1122", account: "****8899" },
    recipient: { phone: "+20 12 4455 6677", account: "****1122" },
    payload: {
      amount: 8000,
      currency: "EGP",
      is_new_beneficiary: true,
      recent_transaction_count_10min: 4,
      usual_latitude: CAIRO_LAT,
      usual_longitude: CAIRO_LNG,
      location_reference_available: false,
      trusted_device_available: false,
    },
  },
  {
    id: "high_value_no_reference",
    category: "suspicious",
    riskTier: "critical",
    sender: { phone: "+20 10 3322 1100", account: "****5566" },
    recipient: { phone: "+20 15 7788 9900", account: "****2233" },
    payload: {
      amount: 50000,
      currency: "EGP",
      is_new_beneficiary: true,
      recent_transaction_count_10min: 2,
      usual_latitude: CAIRO_LAT,
      usual_longitude: CAIRO_LNG,
      location_reference_available: false,
      trusted_device_available: false,
    },
  },
];
