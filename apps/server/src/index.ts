import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { chatsRouter } from "./routes/chats.js";
import { messagesRouter, setMessageIo } from "./routes/messages.js";
import { mediaRouter } from "./routes/media.js";
import { setupSocket } from "./socket/index.js";
import { startExpireJob } from "./jobs/expireMessages.js";
import { getUploadDir } from "./lib/media.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const app = express();
const server = http.createServer(app);

const io = setupSocket(server);
setMessageIo(io);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
getUploadDir();

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/chats", messagesRouter);
app.use("/api/media", mediaRouter);

if (process.env.NODE_ENV === "production") {
  const webDist = path.join(__dirname, "../../web/dist");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

startExpireJob();

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
