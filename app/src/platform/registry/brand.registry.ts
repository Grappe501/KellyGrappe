import { BrandDefinition } from "@/cards/types";

export class BrandRegistry {

  private static brands: Map<string, BrandDefinition> = new Map();

  static register(brand: BrandDefinition) {
    this.brands.set(brand.key, brand);
  }

  static get(key: string) {
    return this.brands.get(key);
  }

  static getAll() {
    return Array.from(this.brands.values());
  }

}