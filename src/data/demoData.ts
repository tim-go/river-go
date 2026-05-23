import type { RiverSection } from "../types";
import { ukKayakingSampleSections } from "./ukKayakingSeed";
import { riverTrywerynSections } from "./riverTrywerynSeed";
import { riverWyeSections } from "./riverWyeSeed";

export const riverSections: RiverSection[] = [
  ...riverTrywerynSections,
  ...riverWyeSections,
  ...ukKayakingSampleSections,
];
