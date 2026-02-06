import { kebabCase } from "scule";

export function getOutputFilename(name: string): string {
  return `use-${kebabCase(name)}-translations.ts`;
}
