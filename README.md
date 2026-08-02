# Nodo · Planificación de nuevas bases

Aplicación React + Vite para analizar demanda, kilómetros excedentes y simular el impacto de nuevas bases de remises sobre un mapa de Argentina.

## Demo pública

[Abrir Nodo en GitHub Pages](https://walterdif20.github.io/nodo-planificacion-remises/)

## Funcionalidad

- Mapa nacional de oportunidades y bases existentes.
- Ranking con búsqueda, provincia, prioridad mínima y distintos órdenes.
- Simulación por localidad, radio de cobertura y captura estimada.
- Escenarios guardados localmente, retomables y exportables.
- Vistas de Operaciones, Viajes, Bases, Reportes y Configuración.
- Exportación del ranking y los escenarios en CSV, y del dataset en JSON.
- Interfaz adaptable a escritorio y móvil.

## Uso

```bash
pnpm install
pnpm dev
```

## Datos y coordenadas

La aplicación usa `src/data/demand.json`, generado desde la pestaña `Tabla` del Excel operativo. El proceso descarta nombres de trabajadores, direcciones, teléfonos y otros datos personales.

Las coordenadas se validan contra las descargas completas de Localidades, Localidades censales y Asentamientos de Georef Argentina. Los nombres operativos que representan barrios o equivalencias se resuelven mediante una capa curada y trazable en `scripts/generate_dataset.py`.

```bash
python scripts/generate_dataset.py "ANALISIS DEMANDA Y EXCEDENTES (VIAJES LARGA DISTANCIA) Enero 2026.xlsx" ruta/a/georef src/data/demand.json
```

La simulación estima ahorro por proximidad; no reemplaza una evaluación financiera que incluya costos fijos, disponibilidad de prestadores y restricciones contractuales.
