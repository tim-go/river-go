const DEFAULT_API_BASE_URL = "http://127.0.0.1:8080";

export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (
    typeof window !== "undefined" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return "";
  }

  return DEFAULT_API_BASE_URL;
}
