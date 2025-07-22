import axios from "axios";
import { Request, Response } from "express";
import { PAGESPEED_API_KEY } from "../keys";

function addHttpsIfMissing(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function isValidUrl(domain: string): boolean {
  const parts = domain.split(".");

  if (
    parts.length < 2 || // needs at least one dot
    parts[0].length < 3 || // at least 3 characters before the first dot
    parts[parts.length - 1].length < 2 // last segment atleast 2 characters
  ) {
    return false;
  }
  return true;
}

function cleanDescription(text: string): string {
  if (!text) return text;

  // Convert markdown-style links to actual anchor tags
  let result = text.replace(
    /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g,
    `<a href='$2' target='_blank'>$1</a>`
  );

  // Temporarily replace <a> tags to preserve them during encoding
  const aTagPlaceholders: { original: string; placeholder: string }[] = [];
  result = result.replace(/<a[^>]*>.*?<\/a>/gi, (match, offset) => {
    const placeholder = `__A_TAG_${aTagPlaceholders.length}__`;
    aTagPlaceholders.push({ original: match, placeholder });
    return placeholder;
  });

  // Encode all < > to &lt; &gt;
  result = result.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Restore <a> tags
  for (const { original, placeholder } of aTagPlaceholders) {
    result = result.replace(placeholder, original);
  }

  return result;
}

function extractMetrics(data: any) {
  const audits = data.lighthouseResult.audits;

  const accessibilityAuditRefs =
    data.lighthouseResult.categories["accessibility"].auditRefs;

  const accessibilityAuditIds = new Set(
    accessibilityAuditRefs.map((ref: any) => ref.id)
  );

  // Extract and group diagnostics for accessibility
  const diagnostics = Object.entries(audits)
    .filter(([id, _]) => accessibilityAuditIds.has(id))
    .map(([id, audit]: any) => ({
      id,
      title: cleanDescription(audit.title),
      description: cleanDescription(audit.description),
      displayValue: audit.displayValue || null,
    }));

  return {
    metrics: {
      accessibilityScore:
        data.lighthouseResult.categories["accessibility"].score * 100,
    },
    diagnostics: {
      accessibility: diagnostics,
    },
  };
}

export const getPagespeedInsights = async (req: Request, res: Response) => {
  const { url, device } = req.query;

  if (!url || typeof url !== "string" || !isValidUrl(url)) {
    return res.status(400).json({ message: "Invalid URL provided." });
  }
  if (
    device != undefined &&
    !["desktop", "mobile"].includes(device?.toString())
  ) {
    return res.status(400).json({ message: "Invalid device." });
  }

  const normalizedUrl = addHttpsIfMissing(url);

  try {
    if (!device) {
      // Both desktop and mobile
      const [desktopRes, mobileRes] = await Promise.all([
        axios.get(
          `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?category=accessibility&url=${normalizedUrl}&key=${PAGESPEED_API_KEY}&strategy=desktop`
        ),
        axios.get(
          `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?category=accessibility&url=${normalizedUrl}&key=${PAGESPEED_API_KEY}&strategy=mobile`
        ),
      ]);

      const desktop = extractMetrics(desktopRes.data);
      const mobile = extractMetrics(mobileRes.data);

      return res
        .status(200)
        .json({ url: normalizedUrl, result: { desktop, mobile } });
    } else {
      // Single device
      const response = await axios.get(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?category=accessibility&url=${normalizedUrl}&key=${PAGESPEED_API_KEY}&strategy=${device}`
      );

      const result = extractMetrics(response.data);
      return res
        .status(200)
        .json({ url: normalizedUrl, result: { [device.toString()]: result } });
    }
  } catch (error: any) {
    console.error("PageSpeed Insights error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch PageSpeed Insights.",
      error: error?.response?.data || error.message,
    });
  }
};
