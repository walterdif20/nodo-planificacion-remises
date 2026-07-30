import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Map, Menu, SlidersHorizontal } from "lucide-react";
import demandData from "./data/demand.json";
import localityData from "./data/localities.json";
import DemandMap from "./components/DemandMap";
import InfoDialog from "./components/InfoDialog";
import KpiStrip from "./components/KpiStrip";
import ManagementView from "./components/ManagementView";
import MethodologyDialog from "./components/MethodologyDialog";
import OpportunityList from "./components/OpportunityList";
import SideNavigation from "./components/SideNavigation";
import SimulatorPanel from "./components/SimulatorPanel";
import TopBar from "./components/TopBar";
import { formatNumber, formatPercent } from "./lib/format";
import { fetchRoadMatrix, fetchRoadRoutes } from "./lib/routing";
import {
  distanceInKm,
  findBestIntermediatePoint,
  findNearestValidLocality,
  simulateBase,
} from "./lib/simulation";

const topDefault = demandData.opportunities.find((item) => item.id === "loc-2") ?? demandData.opportunities[0];
const STORAGE_KEY = "nodo-scenarios-v2";

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
}

function readScenarios() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("nodo-scenarios") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadFile(filename, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [activeSection, setActiveSection] = useState("Planificación");
  const [selected, setSelected] = useState(topDefault);
  const [proposalMode, setProposalMode] = useState("node");
  const [customPoint, setCustomPoint] = useState(null);
  const [radiusKm, setRadiusKm] = useState(120);
  const [capturePercent, setCapturePercent] = useState(80);
  const [province, setProvince] = useState("Todas");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("priority");
  const [opportunityView, setOpportunityView] = useState("Mapa");
  const [showFilters, setShowFilters] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileMode, setMobileMode] = useState("Mapa");
  const [scenarios, setScenarios] = useState(readScenarios);
  const [roadState, setRoadState] = useState({ key: "", status: "idle", matrix: null, provider: "", error: "" });
  const [routeLines, setRouteLines] = useState([]);
  const toastTimer = useRef(null);

  const provinces = useMemo(
    () => [...new Set(demandData.opportunities.map((item) => item.province))].sort((a, b) => a.localeCompare(b, "es")),
    [],
  );

  const filteredOpportunities = useMemo(() => {
    const query = normalize(search);
    const rows = demandData.opportunities.filter((item) => {
      const matchesProvince = province === "Todas" || item.province === province;
      const matchesScore = item.priorityScore >= minScore;
      const matchesSearch = !query || normalize(`${item.locality} ${item.province}`).includes(query);
      return matchesProvince && matchesScore && matchesSearch;
    });
    const comparators = {
      priority: (a, b) => b.priorityScore - a.priorityScore || b.totalExcessKm - a.totalExcessKm,
      excess: (a, b) => b.totalExcessKm - a.totalExcessKm,
      trips: (a, b) => b.totalTrips - a.totalTrips,
      average: (a, b) => b.averageExcessKm - a.averageExcessKm,
    };
    return [...rows].sort(comparators[sortBy]);
  }, [minScore, province, search, sortBy]);

  const rankedOpportunities = filteredOpportunities.slice(0, 60);
  const recommendedPoint = useMemo(
    () => findBestIntermediatePoint(
      demandData.opportunities,
      localityData.localities,
      radiusKm,
      capturePercent,
    ),
    [radiusKm, capturePercent],
  );
  const activeProposal = proposalMode === "free" ? customPoint ?? recommendedPoint : selected;
  const roadCandidates = useMemo(
    () => activeProposal
      ? demandData.opportunities.filter(
          (item) => item.lat != null && item.lng != null && distanceInKm(activeProposal, item) <= radiusKm,
        )
      : [],
    [activeProposal, radiusKm],
  );
  const roadRequestKey = activeProposal
    ? `${activeProposal.id}:${activeProposal.lat.toFixed(5)}:${activeProposal.lng.toFixed(5)}:${roadCandidates.map((item) => item.id).join(",")}`
    : "";
  const roadDistances = roadState.key === roadRequestKey && roadState.status === "ready"
    ? roadState.matrix?.[activeProposal?.id] ?? {}
    : null;
  const simulation = useMemo(
    () => simulateBase(
      demandData.opportunities,
      activeProposal,
      radiusKm,
      capturePercent,
      roadDistances ? { roadDistances, strictRoad: true } : undefined,
    ),
    [activeProposal, capturePercent, radiusKm, roadDistances],
  );
  const routingStatus = roadState.key !== roadRequestKey ? "loading" : roadState.status;

  useEffect(() => {
    if (!activeProposal || !roadRequestKey) return undefined;
    const controller = new AbortController();

    if (!roadCandidates.length) {
      setRoadState({ key: roadRequestKey, status: "ready", matrix: { [activeProposal.id]: {} }, provider: "OSRM / OpenStreetMap", error: "" });
      return () => controller.abort();
    }

    setRoadState((current) => ({ ...current, key: roadRequestKey, status: "loading", error: "" }));
    fetchRoadMatrix([activeProposal], roadCandidates, controller.signal)
      .then((payload) => {
        setRoadState({ key: roadRequestKey, status: "ready", matrix: payload.matrix, provider: payload.provider, error: "" });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setRoadState({ key: roadRequestKey, status: "fallback", matrix: null, provider: "", error: error.message });
      });

    return () => controller.abort();
  }, [activeProposal, roadCandidates, roadRequestKey]);

  const routeDestinationKey = simulation.coveredLocalities.slice(0, 4).map((item) => item.id).join(",");
  useEffect(() => {
    if (routingStatus !== "ready" || !activeProposal || !routeDestinationKey) {
      setRouteLines([]);
      return undefined;
    }

    const controller = new AbortController();
    const destinations = simulation.coveredLocalities.slice(0, 4);
    fetchRoadRoutes(activeProposal, destinations, controller.signal)
      .then((payload) => setRouteLines(payload.routes))
      .catch((error) => {
        if (error.name !== "AbortError") setRouteLines([]);
      });
    return () => controller.abort();
  }, [activeProposal, routeDestinationKey, routingStatus, simulation.coveredLocalities]);

  function notify(message) {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }

  function selectOpportunity(opportunity) {
    setSelected(opportunity);
    setProposalMode("node");
    if (opportunity.lat == null || opportunity.lng == null) {
      notify("La localidad no cuenta con una coordenada válida para simular.");
    }
  }

  function changeProposalMode(mode) {
    setProposalMode(mode);
  }

  function placeIntermediatePoint({ lat, lng }) {
    const validPoint = findNearestValidLocality(localityData.localities, { lat, lng });
    if (!validPoint) {
      notify("No se encontró una localidad válida cerca de ese punto.");
      return;
    }
    setCustomPoint(validPoint);
    setProposalMode("free");
    notify(`Base ajustada a ${validPoint.locality}, ${validPoint.province}.`);
  }

  function useRecommendedPoint() {
    if (!recommendedPoint) {
      notify("No hay suficientes nodos cercanos para sugerir un punto intermedio.");
      return;
    }
    setCustomPoint(null);
    setProposalMode("free");
    notify(`Se aplicó ${recommendedPoint.locality}, la localidad multinodo sugerida.`);
  }

  function selectById(id) {
    const opportunity = demandData.opportunities.find((item) => item.id === id);
    if (opportunity) selectOpportunity(opportunity);
  }

  function persistScenarios(next) {
    setScenarios(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.removeItem("nodo-scenarios");
  }

  function saveScenario() {
    if (!activeProposal) return;
    const scenario = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${activeProposal.id}`,
      selectedId: proposalMode === "node" ? selected.id : null,
      createdAt: new Date().toISOString(),
      locality: activeProposal.locality,
      province: activeProposal.province,
      proposalMode,
      placementSource: activeProposal.placementSource ?? "locality",
      lat: activeProposal.lat,
      lng: activeProposal.lng,
      radiusKm,
      capturePercent,
      savingsKm: simulation.savingsKm,
      reachedTrips: simulation.reachedTrips,
      coveredLocalities: simulation.coveredLocalities.length,
      capturedNodeNames: simulation.coveredLocalities.slice(0, 6).map((item) => item.locality),
      distanceMode: simulation.distanceMode,
      routeProvider: roadState.provider,
    };
    persistScenarios([scenario, ...scenarios].slice(0, 24));
    notify(proposalMode === "free" ? "Escenario de punto intermedio guardado." : `Escenario de ${selected.locality} guardado.`);
  }

  function applyScenario(scenario) {
    if (scenario.proposalMode === "free" && scenario.lat != null && scenario.lng != null) {
      const validPoint = findNearestValidLocality(localityData.localities, scenario);
      if (!validPoint) {
        notify("El escenario anterior no está cerca de una localidad oficial y no puede aplicarse.");
        return;
      }
      setCustomPoint({ ...validPoint, id: `scenario-${scenario.id}`, placementSource: "saved" });
      setProposalMode("free");
    } else {
      const opportunity = demandData.opportunities.find((item) => item.id === scenario.selectedId)
        ?? demandData.opportunities.find((item) => item.locality === scenario.locality && item.province === scenario.province);
      if (opportunity) setSelected(opportunity);
      setProposalMode("node");
    }
    setRadiusKm(scenario.radiusKm);
    setCapturePercent(scenario.capturePercent);
    setActiveSection("Planificación");
    setMobileMode("Simular");
    notify(`Escenario de ${scenario.locality} aplicado.`);
  }

  function deleteScenario(id) {
    persistScenarios(scenarios.filter((scenario) => scenario.id !== id));
    notify("Escenario eliminado.");
  }

  function clearScenarios() {
    persistScenarios([]);
    notify("Se eliminaron los escenarios guardados.");
  }

  function resetFilters() {
    setProvince("Todas");
    setSearch("");
    setMinScore(0);
    setSortBy("priority");
  }

  function downloadRanking() {
    const header = ["Ranking", "Localidad", "Provincia", "Viajes", "Km excedentes", "Promedio km", "Prioridad", "Latitud", "Longitud"];
    const rows = demandData.opportunities.map((item) => [item.rank, item.locality, item.province, item.totalTrips, item.totalExcessKm, item.averageExcessKm, item.priorityScore, item.lat, item.lng]);
    downloadFile("nodo-ranking-enero-2026.csv", `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n")}`, "text/csv;charset=utf-8");
    notify("Ranking exportado en CSV.");
  }

  function downloadJson() {
    downloadFile("nodo-datos-enero-2026.json", JSON.stringify(demandData, null, 2), "application/json;charset=utf-8");
    notify("Dataset exportado en JSON.");
  }

  function downloadScenarios() {
    if (!scenarios.length) return;
    const header = ["Fecha", "Tipo", "Localidad o punto", "Provincia", "Latitud", "Longitud", "Radio km", "Captura %", "Ahorro km", "Viajes alcanzados", "Nodos cubiertos"];
    const rows = scenarios.map((item) => [item.createdAt, item.proposalMode === "free" ? "Punto intermedio" : "Localidad", item.locality, item.province, item.lat, item.lng, item.radiusKm, item.capturePercent, item.savingsKm, item.reachedTrips, item.coveredLocalities]);
    downloadFile("nodo-escenarios.csv", `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n")}`, "text/csv;charset=utf-8");
    notify("Escenarios exportados en CSV.");
  }

  const simulatorProps = {
    meta: demandData.meta,
    opportunities: demandData.opportunities,
    selected: activeProposal,
    selectedNodeId: selected.id,
    proposalMode,
    recommendedPoint,
    radiusKm,
    capturePercent,
    simulation,
    routingStatus,
    routeProvider: roadState.provider,
    onSelectById: selectById,
    onProposalModeChange: changeProposalMode,
    onUseRecommendedPoint: useRecommendedPoint,
    onRadiusChange: setRadiusKm,
    onCaptureChange: setCapturePercent,
    onSave: saveScenario,
    onShowScenarios: () => setActiveSection("Reportes"),
  };

  return (
    <div className={`app-shell${navCollapsed ? " is-nav-collapsed" : ""}`}>
      <TopBar
        hasNotifications
        onToggleMenu={() => setNavCollapsed((value) => !value)}
        onShowNotifications={() => setShowNotifications(true)}
        onShowHelp={() => setShowHelp(true)}
      />
      <SideNavigation
        activeSection={activeSection}
        collapsed={navCollapsed}
        mobileOpen={mobileNavOpen}
        onCollapse={() => setNavCollapsed((value) => !value)}
        onCloseMobile={() => setMobileNavOpen(false)}
        onNavigate={setActiveSection}
      />
      <main className="main-content">
        <header className="mobile-header">
          <div className="brand">Nodo<span>.</span></div>
          <button type="button" aria-label="Abrir menú" onClick={() => setMobileNavOpen(true)}><Menu size={25} /></button>
        </header>

        {activeSection === "Planificación" ? (
          <>
            <section className="page-intro">
              <div className="title-block">
                <h1>Planificación de nuevas bases</h1>
                <p>Demanda y excedentes · {demandData.meta.period}</p>
              </div>
              <KpiStrip meta={demandData.meta} savingsKm={simulation.savingsKm} />
            </section>

            <div className="mobile-mode-tabs" role="tablist" aria-label="Vista móvil">
              {[
                { label: "Mapa", icon: Map },
                { label: "Ranking", icon: BarChart3 },
                { label: "Simular", icon: SlidersHorizontal },
              ].map(({ label, icon: Icon }) => (
                <button className={mobileMode === label ? "is-active" : ""} key={label} onClick={() => setMobileMode(label)} role="tab" aria-selected={mobileMode === label} type="button">
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>

            <section className={`workspace mobile-mode-${mobileMode.toLowerCase()}`}>
              <OpportunityList
                opportunities={rankedOpportunities}
                totalResults={filteredOpportunities.length}
                selectedId={proposalMode === "node" ? selected.id : ""}
                onSelect={selectOpportunity}
                provinces={provinces}
                province={province}
                onProvinceChange={setProvince}
                search={search}
                onSearchChange={setSearch}
                minScore={minScore}
                onMinScoreChange={setMinScore}
                sortBy={sortBy}
                onSortChange={setSortBy}
                activeView={opportunityView}
                onViewChange={(view) => { setOpportunityView(view); setSortBy(view === "Ranking" ? "excess" : "priority"); }}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((value) => !value)}
                onResetFilters={resetFilters}
                onShowMethodology={() => setShowMethodology(true)}
              />
              <DemandMap
                opportunities={proposalMode === "free" ? demandData.opportunities : filteredOpportunities}
                existingBases={demandData.existingBases}
                selected={activeProposal}
                radiusKm={radiusKm}
                onSelect={selectOpportunity}
                proposalMode={proposalMode}
                coveredLocalities={simulation.coveredLocalities}
                onPlacePoint={placeIntermediatePoint}
                routeLines={routeLines}
                routingStatus={routingStatus}
              />
              <div className="desktop-simulator"><SimulatorPanel {...simulatorProps} /></div>
              <div className="mobile-simulator"><SimulatorPanel compact {...simulatorProps} /></div>
            </section>

            <footer className="source-footer">
              <span>Fuente: Excel operativo · Localidades Georef · Rutas OSRM/OpenStreetMap · {demandData.meta.period}</span>
              <button type="button" onClick={() => setShowMethodology(true)}>Ver metodología</button>
            </footer>
          </>
        ) : (
          <ManagementView
            section={activeSection}
            data={demandData}
            scenarios={scenarios}
            search={search}
            onSearchChange={setSearch}
            onNavigate={setActiveSection}
            onApplyScenario={applyScenario}
            onDeleteScenario={deleteScenario}
            onClearScenarios={clearScenarios}
            onDownloadReport={downloadRanking}
            onDownloadJson={downloadJson}
            onDownloadScenarios={downloadScenarios}
            radiusKm={radiusKm}
            capturePercent={capturePercent}
            onRadiusChange={setRadiusKm}
            onCaptureChange={setCapturePercent}
            onResetSettings={() => { setRadiusKm(120); setCapturePercent(80); notify("Parámetros restablecidos."); }}
          />
        )}
      </main>

      {showMethodology && <MethodologyDialog methodology={demandData.methodology} onClose={() => setShowMethodology(false)} />}
      {showNotifications && (
        <InfoDialog title="Datos listos para planificar" eyebrow="Calidad geográfica" onClose={() => setShowNotifications(false)}>
          <div className="notification-summary"><strong>{formatPercent(demandData.meta.coordinateCoveragePercent)}</strong><span>de las oportunidades están geolocalizadas.</span></div>
          <ul className="dialog-list"><li>{formatNumber(demandData.meta.curatedCoordinateLocalities)} barrios o equivalencias fueron revisados.</li><li>{formatNumber(demandData.meta.correctedProvinceLocalities)} inconsistencias de provincia se normalizaron.</li><li>El Excel se usa de forma agregada, sin mostrar datos personales.</li></ul>
        </InfoDialog>
      )}
      {showHelp && (
        <InfoDialog title="Cómo usar Nodo" eyebrow="Ayuda rápida" onClose={() => setShowHelp(false)}>
          <ol className="help-steps"><li><b>Elegí el tipo de ubicación</b><span>una localidad de demanda o una localidad intermedia.</span></li><li><b>Ubicá la base</b><span>usá la sugerencia o hacé clic: el punto se ajustará a la localidad oficial más cercana.</span></li><li><b>Ajustá la cobertura</b><span>el radio se verifica con kilómetros reales por ruta.</span></li><li><b>Compará, guardá y exportá</b><span>revisá distancias, tiempos y nodos capturados.</span></li></ol>
        </InfoDialog>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
