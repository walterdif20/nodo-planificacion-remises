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
        <p>{methodology.simulation}</p>
        <h3>Puntos intermedios</h3>
        <p>La sugerencia evalúa centros ponderados y puntos medios entre nodos cercanos con mayor demanda. Solo considera válida una alternativa cuando su radio alcanza dos o más nodos; el resultado se ordena por ahorro estimado de kilómetros.</p>
        <h3>Coordenadas</h3>
        <p>{methodology.coordinates}</p>
        <div className="methodology-note">{methodology.caveat}</div>
        <button className="secondary-button" type="button" onClick={onClose}>Entendido</button>
      </section>
    </div>
  );
}
