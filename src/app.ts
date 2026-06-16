import express from "express";
import path from "path";
import {
  schedulesRouter,
  scheduleErrorHandler,
} from "./routes/schedules.routes";
import { dashboardRouter, dashboardErrorHandler } from "./routes/dashboard.routes";
import { clientsRouter, clientsErrorHandler } from "./routes/clients.routes";
import { teamsRouter, usersRouter } from "./routes/teams.routes";

export function createApp() {
  const app = express();
  const publicDir = path.join(__dirname, "..", "public");

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "ops.html"));
  });

  app.get("/schedule", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  app.get("/automate", (_req, res) => {
    res.redirect("/");
  });

  app.use(express.static(publicDir, { index: false }));

  app.use("/api/schedules", schedulesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/users", usersRouter);

  app.use(clientsErrorHandler);
  app.use(dashboardErrorHandler);
  app.use(scheduleErrorHandler);

  return app;
}
