export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return "";
}
