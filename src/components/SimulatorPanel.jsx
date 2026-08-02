import { ChevronDown, Crosshair, FolderOpen, MapPin, Route, Save, Sparkles, UsersRound } from "lucide-react";
import { formatNumber } from "../lib/format";

function RangeControl({ id, label, value, min, max, step, suffix, onChange }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="range-control" htmlFor={id}>
      <span>
        <strong>{label}</strong>
        <b>{formatNumber(value)}{suffix}</b>
      </span>
      <input
        id={id}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        style={{ "--range-progress": `${progress}%` }}
        type="range"
        value={value}
      />
      <span className="range-ticks" aria-hidden="true">
        <small>{min}{suffix}</small>
        <small>{Math.round((min + max) / 2)}{suffix}</small>
        <small>{max}{suffix}</small>
      </span>
    </label>
  );
}

export default function SimulatorPanel({
  meta,
  opportunities,
  selected,
  selectedNodeId,
  proposalMode,
  recommendedPoint,
  radiusKm,
  capturePercent,
  simulation,
  routingStatus,
  routeProvider,
  onSelectById,
  onProposalModeChange,
  onUseRecommendedPoint,
  onRadiusChange,
  onCaptureChange,
  onSave,
  onShowScenarios,
  compact = false,
}) {
  const afterExcess = Math.max(meta.totalExcessKm - simulation.savingsKm, 0);

  return (
    <aside className={compact ? "simulator-panel is-compact" : "simulator-panel"} aria-label="Simulador de nueva base">
      <div className="panel-heading simulator-heading">
        <div>
          <h2>Simular nueva base</h2>
          {!compact && <p>Compará el impacto sobre el período analizado.</p>}
        </div>
      </div>

      <div className="proposal-mode-toggle" role="group" aria-label="Tipo de ubicación de la base">
        <button
          aria-pressed={proposalMode === "node"}
          className={proposalMode === "node" ? "is-active" : ""}
          onClick={() => onProposalModeChange("node")}
          type="button"
        >
          <MapPin size={15} /> En localidad
        </button>
        <button
          aria-pressed={proposalMode === "free"}
          className={proposalMode === "free" ? "is-active" : ""}
          onClick={() => onProposalModeChange("free")}
          type="button"
        >
          <Crosshair size={15} /> Punto intermedio
        </button>
      </div>

      {proposalMode === "node" ? (
        <>
          <label className="field-label" htmlFor={compact ? "location-mobile" : "location-desktop"}>
            Localidad
          </label>
          <div className="select-wrap simulator-select">
            <select
              id={compact ? "location-mobile" : "location-desktop"}
              onChange={(event) => onSelectById(event.target.value)}
              value={selectedNodeId ?? ""}
            >
              {opportunities
                .filter((opportunity) => opportunity.lat != null && opportunity.lng != null)
                .map((opportunity) => (
                  <option value={opportunity.id} key={opportunity.id}>
                    {opportunity.locality}, {opportunity.province}
                  </option>
                ))}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </div>
        </>
      ) : (
        <div className="intermediate-point-card">
          <div>
            <Crosshair size={18} />
            <span>
              <strong>{selected ? `${selected.locality}, ${selected.province}` : "Elegí una localidad"}</strong>
              <small>{selected?.placementSource === "recommended" ? "Localidad oficial sugerida para varios nodos" : "Localidad oficial validada"}</small>
            </span>
          </div>
          <button type="button" onClick={onUseRecommendedPoint} disabled={!recommendedPoint}>
            <Sparkles size={14} /> Usar sugerido
          </button>
        </div>
      )}

      {compact && selected && (
        <div className="compact-selected-stats">
          {proposalMode === "free" ? (
            <>
              <div><strong>{formatNumber(simulation.coveredLocalities.length)}</strong><span>nodos</span></div>
              <div><strong>{formatNumber(simulation.reachedTrips)}</strong><span>viajes</span></div>
              <div><strong>{formatNumber(simulation.savingsKm)}</strong><span>km menos</span></div>
            </>
          ) : (
            <>
              <div><strong>{formatNumber(selected.totalTrips)}</strong><span>viajes</span></div>
              <div><strong>{formatNumber(selected.totalExcessKm)}</strong><span>km excedentes</span></div>
              <div><strong>{selected.priorityScore}/100</strong><span>prioridad</span></div>
            </>
          )}
        </div>
      )}

      <RangeControl
        id={compact ? "radius-mobile" : "radius-desktop"}
        label="Radio de cobertura"
        value={radiusKm}
        min={30}
        max={300}
        step={10}
        suffix=" km"
        onChange={onRadiusChange}
      />
      <RangeControl
        id={compact ? "capture-mobile" : "capture-desktop"}
        label="Captura estimada"
        value={capturePercent}
        min={20}
        max={100}
        step={5}
        suffix="%"
        onChange={onCaptureChange}
      />

      <div className={`routing-status is-${routingStatus}`} role="status">
        <Route size={15} />
        <span>
          <strong>
            {routingStatus === "ready" && "Distancia vial real"}
            {routingStatus === "loading" && "Calculando por rutas…"}
            {routingStatus === "fallback" && "Estimación temporal"}
          </strong>
          {!compact && (
            <small>
              {routingStatus === "ready" ? `${routeProvider} · traza y tiempo de viaje` : routingStatus === "loading" ? "Revisando qué nodos entran en el radio vial" : "No se pudo consultar la red vial; se muestra distancia geográfica"}
            </small>
          )}
        </span>
      </div>

      <section className="impact-section" aria-live="polite">
        <h3>Impacto estimado</h3>
        <div className="impact-metrics">
          <div>
            <Route size={22} />
            <strong>{formatNumber(simulation.savingsKm)} <small>km</small></strong>
            <span>menos</span>
          </div>
          <div>
            <UsersRound size={22} />
            <strong>{formatNumber(simulation.reachedTrips)}</strong>
            <span>viajes alcanzados</span>
          </div>
          <div>
            <MapPin size={22} />
            <strong>{formatNumber(simulation.coveredLocalities.length)}</strong>
            <span>{proposalMode === "free" ? "nodos capturados" : "localidades cubiertas"}</span>
          </div>
        </div>
      </section>

      {proposalMode === "free" && (
        <section className="captured-nodes-section">
          <h3>Nodos de demanda capturados <span>{simulation.coveredLocalities.length}</span></h3>
          <div className="captured-node-list">
            {simulation.coveredLocalities.slice(0, 4).map((item) => (
              <div key={item.id}>
                <span><strong>{item.locality}</strong><small>{item.province}</small></span>
                <b>{formatNumber(item.distanceKm, 1)} km{item.durationMinutes != null ? ` · ${formatNumber(item.durationMinutes)} min` : ""}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {!compact && proposalMode === "node" && (
        <section className="comparison-section">
          <h3>Comparación del período</h3>
          <div className="comparison-table">
            <span />
            <span>Actual</span>
            <span>Con nueva base</span>
            <strong>Km excedentes</strong>
            <b>{formatNumber(meta.totalExcessKm)}</b>
            <b className="improved">{formatNumber(afterExcess)}</b>
            <strong>Viajes alcanzados</strong>
            <b>0</b>
            <b className="improved">{formatNumber(simulation.reachedTrips)}</b>
            <strong>Localidades cubiertas</strong>
            <b>0</b>
            <b className="improved">{formatNumber(simulation.coveredLocalities.length)}</b>
          </div>
        </section>
      )}

      <button className="save-button" type="button" onClick={onSave}>
        <Save size={18} /> Guardar escenario
      </button>
      {!compact && (
        <button className="scenario-link" type="button" onClick={onShowScenarios}>
          <FolderOpen size={15} /> Ver escenarios guardados
        </button>
      )}
      {!compact && <p className="local-note">El escenario se guarda localmente en este navegador.</p>}
    </aside>
  );
}
