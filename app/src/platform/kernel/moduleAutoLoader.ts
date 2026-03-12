import { FeatureRegistry } from "../registry/feature.registry";

type ModuleMeta = {
  name: string;
  routes?: {
    path: string;
    page: string;
  }[];
};

export async function autoDiscoverModules() {

  const moduleConfigs = import.meta.glob(
    "../../modules/**/module.json",
    { eager: true }
  ) as Record<string, ModuleMeta>;

  for (const path in moduleConfigs) {

    const config = moduleConfigs[path];

    const moduleDir = path.replace("/module.json", "");

    if (!config.routes) continue;

    for (const route of config.routes) {

      const pageImport = import.meta.glob(
        `${moduleDir}/${route.page}.tsx`
      );

      const importer = Object.values(pageImport)[0];

      if (!importer) {
        console.warn(
          `[module loader] page not found`,
          route.page
        );
        continue;
      }

      const LazyComponent = React.lazy(importer as any);

      FeatureRegistry.register({
        route: route.path,
        component: LazyComponent
      });

    }

  }

}
