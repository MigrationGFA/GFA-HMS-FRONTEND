// GFA Health HMS offline sales demo — API is always disabled.
// Sample data comes from src/data/* and IndexedDB seeds.
export const env = {
  useApi: false as const,
  apiBaseUrl: '' as const,
  offlineDemo: true as const,
} as const;
