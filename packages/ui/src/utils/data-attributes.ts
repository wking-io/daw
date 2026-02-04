export type DataAttributeState = Record<string, boolean | string>;

export function getDataAttributes(states: DataAttributeState): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const [key, value] of Object.entries(states)) {
    const attrName = key.startsWith("data-") ? key : `data-${key}`;
    if (typeof value === "boolean" ? value : value !== undefined) {
      attrs[attrName] = "";
    }
    if (typeof value === "string") {
      attrs[attrName] = value;
    }
  }

  return attrs;
}
