import { createServer } from "node:http";
import next from "next";
import { attachChatGateway } from "./server/chatGateway.mjs";

/**
 * Single origin entry point for AajoTestOS.
 *
 * The app and the realtime gateway share one HTTP server on one port. That is
 * what makes the project work behind a tunnel (ngrok, Cloudflare) and on hosts
 * that expose exactly one port (Railway, Render, Fly). It also means the
 * session cookie is same site for the socket handshake, so realtime
 * authentication works without any CORS configuration at all.
 */

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 8080);

// 0.0.0.0 rather than localhost. Binding to the loopback interface only would
// make the server unreachable from another device, from a tunnel, and from
// inside a container.
const hostname = process.env.HOST ?? "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
  handle(req, res).catch((error) => {
    console.error("[request failed]", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
});

attachChatGateway(httpServer);

httpServer.listen(port, hostname, () => {
  console.log(
    `AajoTestOS ready on http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port} (${dev ? "development" : "production"})`,
  );
  console.log(`Realtime gateway attached at /socket.io on the same port`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    httpServer.close(() => process.exit(0));
  });
}
