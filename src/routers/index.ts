import express from "express";
import accessibilityRouter from "./accessibilityRouter";
const router = express.Router();

// Mount routes
router.get("/", (req, res) => {
  res.send("Welcome to Arc Accessilibty API");
});

router.use("/accessibility-check", accessibilityRouter);

export default router;
