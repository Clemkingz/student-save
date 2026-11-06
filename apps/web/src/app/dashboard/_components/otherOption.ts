export const OTHER = "Other";

/** The value to save: the typed description when "Other" is chosen, otherwise the option itself. */
export function resolveOther(selected: string, detail: string) {
  return selected === OTHER ? detail.trim() : selected;
}
