import { Request, Response, NextFunction } from "express";

const allowedIps = ["123.456.789.0"]; // Example IPs

export const ipFilter = (req: Request, res: Response, next: NextFunction) => {
  const userIp = req.ip;
  if (!userIp) {
    return res.status(403).json({ message: "Forbidden: IP not detected" });
  }
  if (allowedIps.includes(userIp)) {
    return next();
  }
  return res.status(403).json({ message: "Forbidden: IP not allowed" });
};

export const uaFilter = (req: Request, res: Response, next: NextFunction) => {
  const env = process.env.NODE_ENV;
  if (env === "development") {
    return next();
  }

  const botUserAgents = [
    "bot",
    "crawler",
    "spider",
    "postman",
    "curl",
    "wget",
    "scrapy",
    "facebookexternalhit",
    "facebookcatalog",
    "sogou",
    "mywebsearch",
    "facebot",
    "viber",
    "yahoo",
    "robot",
    "jakarta",
    "java",
    "httperf",
    "lwp",
    "libwww",
    "sitebot",
    "baidu",
    "crawler",
    "flicker",
    "mbot",
    "pinger",
    "python",
    "squid",
    "nutch",
    "semrush",
    "ahrefsbot",
    "dataprobe",
    "gsa-crawler",
    "zendesk",
    "raven",
    "zigzag",
    "dmoz",
    "httrack",
    "somebot",
    "msnbot",
  ];

  const userAgent = req.headers["user-agent"]?.toLowerCase();

  if (!userAgent) {
    return res
      .status(403)
      .json({ message: "Forbidden: User agent not detected" });
  }

  if (botUserAgents.some((bot) => userAgent.includes(bot))) {
    return res.status(403).json({ message: "Forbidden: Bot detected" });
  }

  next();
};

/*
import axios from 'axios';

export const restrictToIndia = async (req: Request, res: Response, next: NextFunction) => {
  const env = process.env.NODE_ENV;
  if (env === "development") {
    return next();
  }

  const IPINFO_TOKEN = process.env.IPINFO_TOKEN;
  if (!IPINFO_TOKEN) {
    console.error("IPINFO_TOKEN not found in environment variables");
    return res.status(500).json({ message: "Internal Server Error" });
  }

  const ip = req.ip;
  if (!ip) {
    return res.status(403).json({ message: "Forbidden: IP not detected" });
  }

  try {
    const response = await axios.get(
      `https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`
    );
    const countryCode = response.data.country;
    if (countryCode === "IN") {
      return next();
    } else {
      return res.status(403).json({ message: "Forbidden: Access restricted to India" });
    }
  } catch (error) {
    console.error("Error fetching IP geolocation:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
*/
