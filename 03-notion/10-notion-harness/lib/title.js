export function getPageTitle(title) {
  const trimmed = title.trim();
  return trimmed === "" ? "Untitled" : trimmed;
}
