import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import router from "./routers";
import { errorhandler } from "./middleware/error";
import { ORIGIN, PORT } from "./keys";
import path from "path";

dotenv.config();

const app: Express = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const hostname = new URL(origin).hostname;
      const allowedDomain = /\.arcinclusion\.com$/;

      if (allowedDomain.test(hostname)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(express.static("public"));

app.use("/api/", router);

// app.get("/", (req: Request, res: Response) => {
//   res.json({ message: "Welcome to REO PageSpeed API" });
// });

// Error handling middleware
app.use(errorhandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
