import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { parseArgs } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(String(args.dir || "dist/demo"));
const port = Number(args.port || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".webp": "image/webp" };

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
    const relative = requestPath === "/" ? "presentation.html" : requestPath.replace(/^\/+/, "");
    const target = path.resolve(root, relative);
    if (!target.startsWith(root)) throw new Error("Forbidden");
    const data = await fs.readFile(target);
    response.writeHead(200, { "Content-Type": types[path.extname(target).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  } catch (error) {
    response.writeHead(error.message === "Forbidden" ? 403 : 404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.message === "Forbidden" ? "Forbidden" : "Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MVP webpage: http://127.0.0.1:${port}/`);
  console.log(`Serving: ${root}`);
});
