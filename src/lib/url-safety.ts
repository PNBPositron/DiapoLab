const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".arpa"];

function normalizeHostname(raw: string): string {
  const lower = raw.trim().toLowerCase().replace(/\.$/, "");
  if (lower.startsWith("[") && lower.endsWith("]")) {
    return lower.slice(1, -1);
  }
  return lower;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isBlockedIpv6(host: string): boolean {
  const clean = host.split("%")[0].toLowerCase();
  if (
    clean === "::" ||
    clean === "::1" ||
    clean === "0:0:0:0:0:0:0:1" ||
    clean === "0:0:0:0:0:0:0:0"
  ) {
    return true;
  }
  if (clean.startsWith("::ffff:")) {
    const mapped = clean.slice("::ffff:".length);
    if (isPrivateIpv4(mapped)) return true;
    const hexParts = mapped.split(":");
    if (hexParts.length === 2) {
      const hi = parseInt(hexParts[0], 16);
      const lo = parseInt(hexParts[1], 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        if (isPrivateIpv4(ipv4)) return true;
      }
    }
    return true;
  }
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(clean) || /^fe[89ab][0-9a-f]:/i.test(clean)) {
    return true; // ULA fc00::/7 and link-local fe80::/10
  }
  return false;
}

/** Check whether a hostname points to loopback, private, link-local, or non-standard IP encodings. */
export function isBlockedRemoteHost(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (host === "localhost" || host === "metadata.google.internal" || host === "metadata")
    return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return true;
  // Block integer, hex, or octal IP literals (e.g. 2130706433, 0x7f000001, 0177.0.0.1).
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host) || /(^|\.)0[0-7]+(\.|$)/.test(host)) {
    return true;
  }
  if (isPrivateIpv4(host)) return true;
  if (host.includes(":") && isBlockedIpv6(host)) return true;
  return false;
}

/** Parse and validate an external http(s) URL, rejecting private/internal destinations. */
export function validateExternalUrl(raw: string): { url?: URL; error?: string; status?: number } {
  let target: URL;
  try {
    target = new URL(raw.trim());
  } catch {
    return { error: "Invalid URL.", status: 400 };
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return { error: "Only http(s) URLs are supported.", status: 400 };
  }
  if (isBlockedRemoteHost(target.hostname)) {
    return { error: "Blocked target host.", status: 403 };
  }
  return { url: target };
}

/** Fetch an external http(s) URL while re-validating redirect hops against SSRF targets. */
export async function safeServerFetch(
  initialUrl: URL,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<{ response: Response; finalUrl: URL }> {
  const maxRedirects = init.maxRedirects ?? 4;
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (isBlockedRemoteHost(currentUrl.hostname)) {
      throw new Error("Blocked redirect target.");
    }
    const response = await fetch(currentUrl.toString(), {
      ...init,
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: currentUrl };
      const next = new URL(location, currentUrl);
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new Error("Blocked redirect scheme.");
      }
      if (isBlockedRemoteHost(next.hostname)) {
        throw new Error("Blocked redirect host.");
      }
      currentUrl = next;
      continue;
    }
    return { response, finalUrl: currentUrl };
  }
  throw new Error("Too many redirects.");
}

/** Parse a client-side link and allow only safe http(s) or relative routes (blocking javascript:, data:, vbscript:). */
export function isSafeBrowserUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function escapeHtmlAttr(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[ch] ?? ch,
  );
}
