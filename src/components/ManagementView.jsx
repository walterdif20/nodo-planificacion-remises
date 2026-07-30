import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileJson,
  MapPinCheck,
  Play,
  RotateCcw,
  Route,
  Search,
  Trash2,
} from "lucide-react";
import { formatNumber, formatPercent } from "../lib/format";

function PageHeader({ eyebrow, title, copy, action }) {
  return (
    <header className="management-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action}
    </header>
  );
}

function SummaryCards({ items }) {
  return (
    <section className="summary-card-grid">
      {items.map(({ icon: Icon, label, value, note }) => (
        <article className="summary-card" key={label}>
          <Icon size={22} />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </article>
      ))}
    </section>
  );
}

function DataTable({ children, label }) {
  return <div className="data-table-wrap" role="region" aria-label={label} tabIndex="0">{children}</div>;
}

export default function ManagementView({
  section,
  data,
  scenarios,
  search,
  onSearchChange,
  onNavigate,
  onApplyScenario,
  onDeleteScenario,
  onClearScenarios,
  onDownloadReport,
  onDownloadJson,
  onDownloadScenarios,
  radiusKm,
  capturePercent,
  onRadiusChange,
  onCaptureChange,
  onResetSettings,
}) {
  const sortedBases = [...data.existingBases].sort((a, b) => b.trips - a.trips);
  const filteredTrips = data.opportunities
    .filter((item) => `${item.locality} ${item.province}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))
    .slice(0, 120);
  const topOpportunities = data.opportunities.slice(0, 8);
  const covered = data.meta.geolocatedOpportunityLocalities;
  const coverage = data.meta.coordinateCoveragePercent;

  if (section === "Operaciones") {
    return (
      <div className="management-view">
        <PageHeader
          eyebrow="Operaciones"
          title="Estado de la red actual"
          copy="Lectura consolidada de bases, cobertura y demanda del período analizado."
          action={<button className="primary-action" type="button" onClick={() => onNavigate("Planificación")}>Evaluar una base <ArrowRight size={17} /></button>}
        />
        <SummaryCards items={[
          { icon: Building2, label: "Bases activas", value: formatNumber(data.existingBases.length), note: "con viajes asignados" },
          { icon: Route, label: "Viajes observados", value: formatNumber(data.meta.totalTrips), note: data.meta.period },
          { icon: MapPinCheck, label: "Cobertura geográfica", value: formatPercent(coverage), note: `${covered} oportunidades ubicadas` },
        ]} />
        <section className="management-grid">
          <article className="management-card">
            <div className="card-heading"><div><span>Mayor actividad</span><h2>Bases por viajes asignados</h2></div></div>
            <DataTable label="Bases con mayor actividad">
              <table><thead><tr><th>Base</th><th>Provincia</th><th>Viajes</th><th>Participación</th></tr></thead>
                <tbody>{sortedBases.slice(0, 10).map((base) => <tr key={base.id}><td>{base.name}</td><td>{base.province}</td><td>{formatNumber(base.trips)}</td><td>{formatPercent((base.trips / data.meta.totalTrips) * 100)}</td></tr>)}</tbody>
              </table>
            </DataTable>
          </article>
          <article className="management-card opportunity-summary-card">
            <div className="card-heading"><div><span>Próximas decisiones</span><h2>Oportunidades prioritarias</h2></div></div>
            <ol>{topOpportunities.map((item) => <li key={item.id}><span>{item.rank}</span><div><strong>{item.locality}</strong><small>{item.province}</small></div><b>{formatNumber(item.totalExcessKm)} km</b></li>)}</ol>
          </article>
        </section>
      </div>
    );
  }

  if (section === "Viajes") {
    return (
      <div className="management-view">
        <PageHeader eyebrow="Viajes" title="Demanda consolidada" copy="Vista agregada por localidad; no expone nombres, teléfonos ni direcciones del Excel." />
        <div className="table-toolbar"><div className="large-search"><Search size={17} /><input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar localidad o provincia" /></div><span>{formatNumber(filteredTrips.length)} resultados visibles</span></div>
        <DataTable label="Demanda consolidada por localidad">
          <table className="wide-table"><thead><tr><th>#</th><th>Localidad</th><th>Provincia</th><th>Viajes</th><th>Km excedentes</th><th>Promedio</th><th>Prioridad</th><th>Geografía</th></tr></thead>
            <tbody>{filteredTrips.map((item) => <tr key={item.id}><td>{item.rank}</td><td><strong>{item.locality}</strong></td><td>{item.province}</td><td>{formatNumber(item.totalTrips)}</td><td>{formatNumber(item.totalExcessKm)}</td><td>{formatNumber(item.averageExcessKm)} km</td><td><span className="score-pill">{item.priorityScore}</span></td><td><span className="status-good"><CheckCircle2 size={14} /> Validada</span></td></tr>)}</tbody>
          </table>
        </DataTable>
      </div>
    );
  }

  if (section === "Bases") {
    return (
      <div className="management-view">
        <PageHeader eyebrow="Bases" title="Red de remises" copy="Inventario de bases detectadas en los viajes del período." action={<button className="primary-action" type="button" onClick={() => onNavigate("Planificación")}>Simular ampliación <Play size={17} /></button>} />
        <SummaryCards items={[
          { icon: Building2, label: "Bases detectadas", value: formatNumber(sortedBases.length), note: "con coordenadas validadas" },
          { icon: Route, label: "Asignaciones", value: formatNumber(sortedBases.reduce((sum, base) => sum + base.trips, 0)), note: "registros con base informada" },
          { icon: MapPinCheck, label: "Mayor volumen", value: sortedBases[0]?.name ?? "—", note: `${formatNumber(sortedBases[0]?.trips)} viajes` },
        ]} />
        <DataTable label="Inventario de bases">
          <table className="wide-table"><thead><tr><th>Base</th><th>Provincia</th><th>Viajes asignados</th><th>Latitud</th><th>Longitud</th><th>Coordenada</th></tr></thead>
            <tbody>{sortedBases.map((base) => <tr key={base.id}><td><strong>{base.name}</strong></td><td>{base.province}</td><td>{formatNumber(base.trips)}</td><td>{base.lat.toFixed(5)}</td><td>{base.lng.toFixed(5)}</td><td><span className="status-good"><CheckCircle2 size={14} /> Validada</span></td></tr>)}</tbody>
          </table>
        </DataTable>
      </div>
    );
  }

  if (section === "Reportes") {
    return (
      <div className="management-view">
        <PageHeader eyebrow="Reportes" title="Exportaciones y escenarios" copy="Descargá la base analítica o retomá simulaciones guardadas en este navegador." />
        <section className="report-actions">
          <button type="button" onClick={onDownloadReport}><Download size={19} /><span><strong>Ranking CSV</strong><small>248 oportunidades y métricas</small></span></button>
          <button type="button" onClick={onDownloadJson}><FileJson size={19} /><span><strong>Datos JSON</strong><small>Dataset completo de la app</small></span></button>
          <button type="button" onClick={onDownloadScenarios} disabled={!scenarios.length}><Download size={19} /><span><strong>Escenarios CSV</strong><small>{scenarios.length ? `${scenarios.length} guardados` : "Sin escenarios"}</small></span></button>
        </section>
        <section className="management-card scenario-card">
          <div className="card-heading"><div><span>Simulador</span><h2>Escenarios guardados</h2></div>{scenarios.length > 0 && <button className="danger-link" type="button" onClick={onClearScenarios}><Trash2 size={14} /> Borrar todos</button>}</div>
          {scenarios.length === 0 ? <div className="empty-scenarios"><MapPinCheck size={28} /><strong>Todavía no guardaste escenarios</strong><p>Creá uno desde Planificación y aparecerá acá para compararlo o retomarlo.</p><button type="button" onClick={() => onNavigate("Planificación")}>Ir al simulador</button></div> : (
            <div className="scenario-list">{scenarios.map((scenario) => <article key={scenario.id}><div><span>{new Date(scenario.createdAt).toLocaleDateString("es-AR")}</span><h3>{scenario.locality}</h3><p>{scenario.province} · {scenario.radiusKm} km · {scenario.capturePercent}% captura</p></div><dl><div><dt>Ahorro</dt><dd>{formatNumber(scenario.savingsKm)} km</dd></div><div><dt>Viajes</dt><dd>{formatNumber(scenario.reachedTrips)}</dd></div><div><dt>Localidades</dt><dd>{formatNumber(scenario.coveredLocalities)}</dd></div></dl><div className="scenario-actions"><button type="button" onClick={() => onApplyScenario(scenario)}><Play size={14} /> Aplicar</button><button className="icon-danger" type="button" aria-label={`Eliminar escenario de ${scenario.locality}`} onClick={() => onDeleteScenario(scenario.id)}><Trash2 size={15} /></button></div></article>)}</div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="management-view">
      <PageHeader eyebrow="Configuración" title="Preferencias del simulador" copy="Ajustes iniciales para comparar alternativas de cobertura." />
      <section className="settings-grid">
        <article className="management-card settings-card">
          <div className="card-heading"><div><span>Valores activos</span><h2>Parámetros predeterminados</h2></div></div>
          <label><span>Radio de cobertura <b>{radiusKm} km</b></span><input type="range" min="30" max="300" step="10" value={radiusKm} onChange={(event) => onRadiusChange(Number(event.target.value))} /></label>
          <label><span>Captura estimada <b>{capturePercent}%</b></span><input type="range" min="20" max="100" step="5" value={capturePercent} onChange={(event) => onCaptureChange(Number(event.target.value))} /></label>
          <button className="secondary-button" type="button" onClick={onResetSettings}><RotateCcw size={15} /> Restablecer 120 km / 80%</button>
        </article>
        <article className="management-card data-quality-card">
          <div className="quality-icon"><MapPinCheck size={30} /></div>
          <span>Calidad de datos</span><h2>{formatPercent(coverage)} geolocalizado</h2>
          <p>{covered} de {data.meta.positiveOpportunityLocalities} oportunidades cuentan con coordenadas. {data.meta.curatedCoordinateLocalities} nombres de barrios o equivalencias fueron curados y {data.meta.correctedProvinceLocalities} provincias inconsistentes fueron normalizadas.</p>
          <ul><li><CheckCircle2 size={15} /> Coordenadas dentro de límites argentinos</li><li><CheckCircle2 size={15} /> Emparejamiento oficial por nombre exacto</li><li><CheckCircle2 size={15} /> Sin datos personales en la aplicación</li></ul>
        </article>
      </section>
    </div>
  );
}
