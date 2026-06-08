const UPLOAD_CACHE_VERSION = "corp-v2";

export function withUploadCacheBust(src) {
  if (!src || typeof src !== "string" || !src.includes("/uploads/")) return src;

  try {
    const url = new URL(src, window.location.origin);
    const isUploadPath = url.pathname.startsWith("/uploads/");
    const isKnownUploadHost = [
      "api.itajobicarsclub.com.br",
      "localhost",
      "127.0.0.1",
    ].includes(url.hostname);

    if (!isUploadPath || !isKnownUploadHost || url.searchParams.has("v")) return src;

    url.searchParams.set("v", UPLOAD_CACHE_VERSION);
    return url.toString();
  } catch {
    return src;
  }
}
