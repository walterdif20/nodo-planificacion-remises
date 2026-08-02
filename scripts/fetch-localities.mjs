import { mkdir, writeFile } from "node:fs/promises";

const sourceUrl = new URL("https://apis.datos.gob.ar/georef/api/v2.0/localidades");
sourceUrl.searchParams.set("max", "5000");

const response = await fetch(sourceUrl, {
  headers: { accept: "application/json" },
});

if (!response.ok) {
  throw new Error(`Georef respondió ${response.status}`);
}

const payload = await response.json();
const localities = payload.localidades
  .filter((item) => Number.isFinite(item.centroide?.lat) && Number.isFinite(item.centroide?.lon))
  .map((item) => ({
    id: item.id,
    name: item.nombre,
    province: item.provincia?.nombre ?? "Sin provincia",
    lat: item.centroide.lat,
    lng: item.centroide.lon,
  }))
  .sort((first, second) =>
    first.province.localeCompare(second.province, "es") || first.name.localeCompare(second.name, "es"),
  );

const output = {
  meta: {
    source: "Georef Argentina",
    sourceUrl: sourceUrl.origin + sourceUrl.pathname,
    generatedAt: new Date().toISOString().slice(0, 10),
    total: localities.length,
  },
  localities,
};

const outputDirectory = new URL("../src/data/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL("localities.json", outputDirectory), `${JSON.stringify(output)}\n`, "utf8");

console.log(`Catálogo creado con ${localities.length} localidades oficiales.`);
