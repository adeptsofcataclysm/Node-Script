import fs from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { attachVisitTrackRoutes } from "./visit-track-routes";
import { attachAdeptsQuizBoardRoutes } from "./adepts-quiz-board-routes";
import { attachAdeptsSessionRoutes } from "./adepts-session-routes";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

attachVisitTrackRoutes(app);
attachAdeptsQuizBoardRoutes(app);
attachAdeptsSessionRoutes(app);


const webStaticRoot = process.env["WEB_STATIC_ROOT"]?.trim();
if (webStaticRoot) {
  const abs = path.resolve(webStaticRoot);
  if (fs.existsSync(abs)) {
    // Serves Vite’s dist (JS/CSS, index at /). Client-side routes work after the first load.
    // For “deep link” reloads on /admin, /adepts-game, etc., use a reverse proxy with
    // try_files → /index.html, or use the Vite dev server; do not add a catch-all here (Socket.io
    // and Express share the same HTTP server).
    app.use(express.static(abs, { index: "index.html" }));
  } else {
    logger.warn(
      { webStaticRoot: abs },
      "WEB_STATIC_ROOT is set but path does not exist; skipping static",
    );
  }
}

export default app;
