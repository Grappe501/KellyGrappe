import { FeatureRegistry } from "@platform/registry/feature.registry";
import LiveContactsListPage from "./LiveContactsListPage";

FeatureRegistry.register({
  route: "/live",
  component: LiveContactsListPage,
});
