import { X } from "lucide-react";

export default function MethodologyDialog({ methodology, onClose }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="methodology-title"
        aria-modal="true"
        className="methodology-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        <h2 id="methodology-title">Cómo se calcula la oportunidad</h2>
        <p>{methodology.priority}</p>
        <h3>Simulación</h3>
        <p>El ahorro aplica la captura configurada sobre los kilómetros excedentes del Excel y un peso por proximidad. Para decidir qué nodos entran en el radio y calcular ese peso se usa la distancia real por la red vial.</p>
        <h3>Distancias de ruta</h3>
        <p>Las distancias, tiempos y trazas principales se consultan con OSRM sobre OpenStreetMap. Mientras se resuelve la consulta se muestra una aproximación geográfica claramente identificada.</p>
        <h3>Puntos intermedios</h3>
        <p>La sugerencia evalúa los centroides del padrón oficial de Georef Argentina. Solo considera una localidad cuando alcanza dos o más nodos de demanda y la ordena por ahorro estimado; la cobertura final se verifica sobre rutas reales.</p>
        <h3>Coordenadas</h3>
        <p>{methodology.coordinates}</p>
        <div className="methodology-note">{methodology.caveat}</div>
        <button className="secondary-button" type="button" onClick={onClose}>Entendido</button>
      </section>
    </div>
  );
}
