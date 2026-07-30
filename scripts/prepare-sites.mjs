import { copyFile, mkdir, writeFile } from "node:fs/promises";

const serverDirectory = new URL("../dist/server/", import.meta.url);
const workerPath = new URL("index.js", serverDirectory);

const workerSource = `import { handleRoutingRequest } from "./routing.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/road-")) {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Método no permitido." }), {
          status: 405,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
      let payload;
      try {
        payload = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Solicitud inválida." }), {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      }
      return handleRoutingRequest(url.pathname, payload);
    }

    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || request.method !== "GET" || !acceptsHtml) {
      return response;
    }

    const fallbackUrl = new URL("/client/index.html", request.url);
    return env.ASSETS.fetch(new Request(fallbackUrl, request));
  },
};
`;

await mkdir(serverDirectory, { recursive: true });
await writeFile(workerPath, workerSource, "utf8");
await copyFile(new URL("../server/routing.js", import.meta.url), new URL("routing.js", serverDirectory));
