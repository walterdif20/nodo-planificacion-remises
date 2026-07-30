import {
  ChevronDown,
  Info,
  ListOrdered,
  MapPinned,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { formatNumber } from "../lib/format";

export default function OpportunityList({
  opportunities,
  totalResults,
  selectedId,
  onSelect,
  provinces,
  province,
  onProvinceChange,
  search,
  onSearchChange,
  minScore,
  onMinScoreChange,
  sortBy,
  onSortChange,
  activeView,
  onViewChange,
  showFilters,
  onToggleFilters,
  onResetFilters,
  onShowMethodology,
}) {
  return (
    <aside className="opportunity-panel" aria-label="Ranking de oportunidades">
      <div className="panel-heading">
        <h2>Oportunidades</h2>
        <p>{formatNumber(totalResults)} localidades según los filtros.</p>
      </div>

      <div className="panel-tabs" role="tablist" aria-label="Vistas de oportunidad">
        <button
          className={activeView === "Mapa" ? "is-active" : ""}
          role="tab"
          aria-selected={activeView === "Mapa"}
          type="button"
          onClick={() => onViewChange("Mapa")}
        >
          <MapPinned size={15} /> Mapa
        </button>
        <button
          className={activeView === "Ranking" ? "is-active" : ""}
          role="tab"
          aria-selected={activeView === "Ranking"}
          type="button"
          onClick={() => onViewChange("Ranking")}
        >
          <ListOrdered size={15} /> Ranking
        </button>
        <button role="tab" aria-selected="false" type="button" onClick={onShowMethodology}>
          <Info size={15} /> Método
        </button>
      </div>

      <div className="opportunity-search">
        <Search size={15} aria-hidden="true" />
        <input
          aria-label="Buscar localidad"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar localidad"
          type="search"
          value={search}
        />
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <label htmlFor="province-filter">
              Provincia
              <span className="select-wrap">
                <select
                  id="province-filter"
                  value={province}
                  onChange={(event) => onProvinceChange(event.target.value)}
                >
                  <option value="Todas">Todas</option>
                  {provinces.map((name) => <option value={name} key={name}>{name}</option>)}
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
            <label htmlFor="sort-filter">
              Ordenar por
              <span className="select-wrap">
                <select id="sort-filter" value={sortBy} onChange={(event) => onSortChange(event.target.value)}>
                  <option value="priority">Prioridad</option>
                  <option value="excess">Km excedentes</option>
                  <option value="trips">Viajes</option>
                  <option value="average">Excedente promedio</option>
                </select>
                <ChevronDown size={15} aria-hidden="true" />
              </span>
            </label>
          </div>
          <label className="score-filter" htmlFor="score-filter">
            <span>Prioridad mínima <b>{minScore}</b></span>
            <input
              id="score-filter"
              max="80"
              min="0"
              onChange={(event) => onMinScoreChange(Number(event.target.value))}
              step="5"
              type="range"
              value={minScore}
            />
          </label>
          <button className="reset-filter-button" type="button" onClick={onResetFilters}>
            <RotateCcw size={13} /> Restablecer
          </button>
        </div>
      )}

      <ol className="opportunity-list">
        {opportunities.map((opportunity, index) => (
          <li key={opportunity.id}>
            <button
              className={opportunity.id === selectedId ? "opportunity-row is-selected" : "opportunity-row"}
              type="button"
              onClick={() => onSelect(opportunity)}
            >
              <span className="rank-number">{activeView === "Ranking" ? index + 1 : opportunity.rank}</span>
              <span className="opportunity-place">
                <strong>{opportunity.locality}</strong>
                <small>{opportunity.province} · {formatNumber(opportunity.totalTrips)} viajes</small>
              </span>
              <span className="opportunity-value">
                <strong>{formatNumber(opportunity.totalExcessKm)}</strong>
                <small>km excedentes</small>
              </span>
              <span className="score-mark" aria-label={`Prioridad ${opportunity.priorityScore} de 100`}>
                {opportunity.priorityScore}
              </span>
            </button>
          </li>
        ))}
        {opportunities.length === 0 && (
          <li className="empty-list-state">No hay localidades que coincidan con los filtros.</li>
        )}
      </ol>

      <button className="filter-button" type="button" onClick={onToggleFilters} aria-expanded={showFilters}>
        <SlidersHorizontal size={17} />
        Filtros
        <ChevronDown className={showFilters ? "rotated" : ""} size={16} />
      </button>
    </aside>
  );
}
