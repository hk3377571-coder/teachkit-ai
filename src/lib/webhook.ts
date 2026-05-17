const KEY = "ats.makeWebhookUrl";
export function getWebhookUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY) || "";
}
export function setWebhookUrl(url: string) {
  localStorage.setItem(KEY, url);
}
