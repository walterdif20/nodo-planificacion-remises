import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleRoutingRequest } from "./server/routing.js";

function routingApi() {
  return {
    name: "nodo-routing-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        if (!pathname.startsWith("/api/road-")) return next();
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "Método no permitido." }));
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          const payload = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          const apiResponse = await handleRoutingRequest(pathname, payload);
          response.statusCode = apiResponse.status;
          apiResponse.headers.forEach((value, name) => response.setHeader(name, value));
          response.end(Buffer.from(await apiResponse.arrayBuffer()));
        } catch {
          response.statusCode = 400;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Solicitud inválida." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isGitHubPages = mode === "pages";

  return {
    base: isGitHubPages ? "/nodo-planificacion-remises/" : "/",
    plugins: [react(), routingApi()],
    build: {
      outDir: isGitHubPages ? "dist/pages" : "dist/client",
    },
    server: {
      host: "127.0.0.1",
      port: 4173,
    },
  };
});
