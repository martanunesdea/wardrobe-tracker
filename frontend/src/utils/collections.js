/**
 * Shared collection utilities.
 */

/**
 * Recursively flatten a collection tree into a label-prefixed list
 * suitable for <select> dropdowns. Handles arbitrary nesting depth.
 */
export function flattenCollections(collections, parentId = null, prefix = "") {
  const result = [];
  const children = collections.filter(
    (c) => (c.parentId || null) === parentId
  );
  for (const c of children) {
    const label = prefix ? `${prefix} › ${c.name}` : c.name;
    result.push({ id: c.id, label });
    result.push(...flattenCollections(collections, c.id, label));
  }
  return result;
}
