import { BrandRegistry } from "../registry";

export function registerDefaultBrands() {
  BrandRegistry.register({
    key: "kelly_for_sos",
    name: "Kelly for Arkansas Secretary of State",
    organizationType: "campaign",
    workspaceType: "campaign",
    theme: {
      name: "Kelly for SOS",
      primaryColor: "#4338ca",
      secondaryColor: "#0f172a",
      accentColor: "#7c3aed",
      successColor: "#059669",
      warningColor: "#d97706",
      dangerColor: "#dc2626",
      surfaceColor: "#ffffff",
      surfaceAltColor: "#f8fafc",
      borderColor: "#cbd5e1",
      textColor: "#0f172a",
      textMutedColor: "#475569",
      headingColor: "#0f172a",
      radius: "xl",
      shadowStyle: "soft",
      fontFamilySans: "Inter",
      fontFamilyDisplay: "Inter"
    }
  });

  BrandRegistry.register({
    key: "naacp_default",
    name: "NAACP",
    organizationType: "nonprofit",
    workspaceType: "civic_org",
    theme: {
      name: "NAACP",
      primaryColor: "#111827",
      secondaryColor: "#2563eb",
      accentColor: "#1d4ed8",
      successColor: "#059669",
      warningColor: "#d97706",
      dangerColor: "#dc2626",
      surfaceColor: "#ffffff",
      surfaceAltColor: "#eff6ff",
      borderColor: "#bfdbfe",
      textColor: "#111827",
      textMutedColor: "#475569",
      headingColor: "#111827",
      radius: "lg",
      shadowStyle: "soft",
      fontFamilySans: "Inter",
      fontFamilyDisplay: "Inter"
    }
  });
}