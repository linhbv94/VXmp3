export function getRecentItems(storageKey: string, maxItems: number = 5): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, maxItems);
    }
  } catch (err) {
    console.warn('Failed to parse recent items for key:', storageKey, err);
  }
  return [];
}

export function addRecentItem(storageKey: string, path: string, maxItems: number = 5): string[] {
  if (!path || typeof path !== 'string' || !path.trim()) return getRecentItems(storageKey, maxItems);
  const normalizedPath = path.trim();
  const current = getRecentItems(storageKey, 20);
  const key = (value: string) => value.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const filtered = current.filter((existing) => key(existing) !== key(normalizedPath));
  const updated = [normalizedPath, ...filtered].slice(0, maxItems);
  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('vx_recent_update', { detail: { key: storageKey, items: updated } })
    );
  } catch (err) {
    console.warn('Failed to save recent item for key:', storageKey, err);
  }
  return updated;
}

export function getShortPathName(fullPath: string): string {
  if (!fullPath) return '';
  const parts = fullPath.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.pop() || fullPath;
}
