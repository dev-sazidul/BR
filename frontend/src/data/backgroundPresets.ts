import catalog from "./naturalBackgrounds.json";

export type NaturalCategory = "nature" | "beach" | "mountains" | "lifestyle" | "outdoor" | "studio";

export type NaturalBackground = {
  id: string;
  category: NaturalCategory;
  label: string;
  thumb: string;
  full: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
};

export const NATURAL_CATEGORIES: Array<{ id: NaturalCategory; label: string }> = [
  { id: "nature", label: "Nature" },
  { id: "beach", label: "Beach" },
  { id: "mountains", label: "Mountains" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "outdoor", label: "Outdoor" },
  { id: "studio", label: "Studio" },
];

export const NATURAL_BACKGROUNDS = catalog as NaturalBackground[];

export function presetById(id: string): NaturalBackground | undefined {
  return NATURAL_BACKGROUNDS.find((item) => item.id === id);
}
