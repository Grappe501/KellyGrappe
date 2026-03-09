import { FeatureRegistry } from "../registry";

export function registerDefaultFeatures() {
  [
    "contacts",
    "followups",
    "messaging",
    "sms",
    "email",
    "field",
    "events",
    "analytics",
    "volunteers",
    "relationships",
    "contact_import",
    "business_card_scan",
    "organizer_tree",
    "theme_customization",
    "ai",
    "training"
  ].forEach((feature) => {
    FeatureRegistry.enable(feature as any);
  });
}