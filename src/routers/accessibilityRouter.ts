import express from "express";
import { getPagespeedInsights } from "../controllers/accessibilityController";

const router = express.Router();

router.route("/").get(getPagespeedInsights);

export default router;
