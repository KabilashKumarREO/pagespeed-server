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

function extractGroupedMetrics(data: any, detailed: boolean = false) {
  const passed: Record<string, any> = {};
  const failed: Record<string, any> = {};
  const notApplicable: Record<string, any> = {};

  const { categories, categoryGroups, audits } = data.lighthouseResult;
  const accessibilityScore = categories["accessibility"].score * 100;
  const auditRefs = categories["accessibility"].auditRefs;

  // Process each audit and categorize based on score
  Object.entries(audits).forEach(([auditId, audit]: [string, any]) => {
    const { score, id, title, description, scoreDisplayMode } = audit;

    // Find the category group for this audit
    const auditRef = auditRefs.find((ref: any) => ref.id === auditId);
    const categoryGroupId = auditRef?.group;
    const categoryWeight = auditRef?.weight;
    const categoryGroup = categoryGroups[categoryGroupId];

    const auditInfo = detailed
      ? {
          id,
          title: cleanDescription(title),
          description: cleanDescription(description),
          scoreDisplayMode,
          score,
          weight: categoryWeight,
          details: audit.details,
        }
      : {
          id,
          title: cleanDescription(title),
          description: cleanDescription(description),
          scoreDisplayMode,
          score,
          weight: categoryWeight,
        };

    // Categorize based on score
    if (score === 1) {
      // Passed
      if (!passed[categoryGroupId]) {
        passed[categoryGroupId] = {
          title: categoryGroup?.title || "Unknown",
          description: categoryGroup?.description || "",
          audits: {},
        };
      }
      passed[categoryGroupId].audits[auditId] = auditInfo;
    } else if (score === 0) {
      // Failed
      if (!failed[categoryGroupId]) {
        failed[categoryGroupId] = {
          title: categoryGroup?.title || "Unknown",
          description: categoryGroup?.description || "",
          audits: {},
        };
      }
      failed[categoryGroupId].audits[auditId] = auditInfo;
    } else if (score === null) {
      // Not applicable
      if (!notApplicable[categoryGroupId]) {
        notApplicable[categoryGroupId] = {
          title: categoryGroup?.title || "Unknown",
          description: categoryGroup?.description || "",
          audits: {},
        };
      }
      notApplicable[categoryGroupId].audits[auditId] = auditInfo;
    }
  });

  return {
    accessibilityScore,
    passed,
    failed,
    notApplicable,
  };
}

export const getPagespeedInsights = async (req: Request, res: Response) => {
  const { url, device, detailed } = req.query;

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

  const isDetailed = detailed === "true";

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

      const desktop = extractGroupedMetrics(desktopRes.data, isDetailed);
      const mobile = extractGroupedMetrics(mobileRes.data, isDetailed);

      return res
        .status(200)
        .json({ url: normalizedUrl, result: { desktop, mobile } });
    } else {
      // Single device
      const response = await axios.get(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?category=accessibility&url=${normalizedUrl}&key=${PAGESPEED_API_KEY}&strategy=${device}`
      );

      return res.status(200).json({
        url: normalizedUrl,
        result: {
          [device.toString()]: extractGroupedMetrics(response.data, isDetailed),
        },
      });
    }
  } catch (error: any) {
    console.error("PageSpeed Insights error:", error.message);
    return res.status(500).json({
      message: "Failed to fetch PageSpeed Insights.",
      error: error?.response?.data || error.message,
    });
  }
};
