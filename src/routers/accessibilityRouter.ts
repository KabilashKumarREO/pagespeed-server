import express from "express";
import {
  getPagespeedInsightsV0,
  getPagespeedInsightsV1,
  getPagespeedInsightsV2,
} from "../controllers/accessibilityController";

const router = express.Router();

router.route("/").get(getPagespeedInsightsV0);
router.route("/v1").get(getPagespeedInsightsV1);
router.route("/v2").get(getPagespeedInsightsV2);

export default router;
