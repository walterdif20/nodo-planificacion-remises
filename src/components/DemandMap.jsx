import { useEffect, useMemo, useRef } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { formatNumber } from "../lib/format";

const ARGENTINA_CENTER = [-38.2, -64.2];

function MapController({ selected }) {
  const map = useMap();
  const initialCoordinates = useRef(`${selected?.lat}:${selected?.lng}`);
  useEffect(() => {
    map.setView(ARGENTINA_CENTER, 4, { animate: false });
  }, [map]);
  useEffect(() => {
    if (`${selected?.lat}:${selected?.lng}` === initialCoordinates.current) return;
    if (selected?.lat != null && selected?.lng != null) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 5), { duration: 0.9 });
    }
  }, [map, selected]);
  return null;
}

function FreePointPicker({ enabled, onPlacePoint }) {
  useMapEvents({
    click(event) {
      if (enabled) onPlacePoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export default function DemandMap({
  opportunities,
  existingBases,
  selected,
  radiusKm,
  onSelect,
  proposalMode,
  coveredLocalities,
  onPlacePoint,
  routeLines,
  routingStatus,
}) {
  const isIntermediateMode = proposalMode === "free";
  const coveredIds = useMemo(
    () => new Set(coveredLocalities.map((item) => item.id)),
    [coveredLocalities],
  );
  const maxExcess = useMemo(
    () => Math.max(...opportunities.map((opportunity) => opportunity.totalExcessKm), 1),
    [opportunities],
  );
  const visibleOpportunities = useMemo(
    () => {
      const visible = opportunities.length > 120
        ? opportunities.filter(
            (opportunity) =>
              opportunity.priorityScore >= 30 ||
              opportunity.id === selected?.id ||
              coveredIds.has(opportunity.id),
          )
        : opportunities;
      return isIntermediateMode
        ? [...visible].sort(
            (first, second) => Number(coveredIds.has(first.id)) - Number(coveredIds.has(second.id)),
          )
        : visible;
    },
    [coveredIds, isIntermediateMode, opportunities, selected?.id],
  );

  return (
    <section className={`map-panel${isIntermediateMode ? " is-free-placement" : ""}`} aria-label="Mapa de demanda y bases">
      <MapContainer
        className={isIntermediateMode ? "is-placement-mode" : ""}
        center={ARGENTINA_CENTER}
        zoom={4}
        minZoom={3}
        maxZoom={11}
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {visibleOpportunities
          .filter((opportunity) => opportunity.lat != null && opportunity.lng != null)
          .map((opportunity) => {
            const isSelected = !isIntermediateMode && opportunity.id === selected?.id;
            const isCovered = isIntermediateMode && coveredIds.has(opportunity.id);
            const radius = 3.5 + 9.5 * Math.sqrt(opportunity.totalExcessKm / maxExcess);
            return (
              <CircleMarker
                center={[opportunity.lat, opportunity.lng]}
                bubblingMouseEvents={false}
                className={`demand-marker${isSelected ? " is-selected" : ""}${isCovered ? " is-covered" : ""}`}
                eventHandlers={{
                  click: () => {
                    if (isIntermediateMode) {
                      onPlacePoint({ lat: opportunity.lat, lng: opportunity.lng });
                    } else {
                      onSelect(opportunity);
                    }
                  },
                }}
                fillColor="#f1642e"
                fillOpacity={isSelected || isCovered ? 1 : isIntermediateMode ? 0.22 : 0.72}
                key={`${proposalMode}-${opportunity.id}`}
                pathOptions={{
                  color: isSelected || isCovered ? "#ffffff" : "#f1642e",
                  opacity: isSelected || isCovered || !isIntermediateMode ? 1 : 0.22,
                  weight: isSelected ? 4 : isCovered ? 2.4 : 1,
                }}
                radius={isSelected ? radius + 3 : isCovered ? radius + 1.5 : radius}
              >
                <Tooltip
                  className={isSelected ? "map-tooltip selected-map-tooltip" : "map-tooltip"}
                  direction="right"
                  offset={[12, 0]}
                  opacity={1}
                  permanent={isSelected}
                  sticky={!isSelected}
                >
                  <div className="tooltip-content">
                    <strong>{opportunity.locality}</strong>
                    <span>{opportunity.province}</span>
                    <dl>
                      <div>
                        <dt>Viajes</dt>
                        <dd>{formatNumber(opportunity.totalTrips)}</dd>
                      </div>
                      <div>
                        <dt>Km excedentes</dt>
                        <dd>{formatNumber(opportunity.totalExcessKm)}</dd>
                      </div>
                      <div>
                        <dt>Prioridad</dt>
                        <dd>{opportunity.priorityScore}/100</dd>
                      </div>
                    </dl>
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}

        {routeLines.map((route, index) => (
            <Polyline
              interactive
              key={`route-${route.id}`}
              positions={route.positions}
              pathOptions={{ color: index === 0 ? "#43523e" : "#75816c", opacity: 0.8, weight: index === 0 ? 3.2 : 2.2 }}
            >
              <Tooltip className="map-tooltip" sticky>
                <div className="tooltip-content compact">
                  <strong>Ruta a {route.locality}</strong>
                  <span>{formatNumber(route.distanceKm, 1)} km · {formatNumber(route.durationMinutes)} min</span>
                </div>
              </Tooltip>
            </Polyline>
          ))}

        {existingBases.map((base) => {
          const delta = 0.055;
          return (
            <Rectangle
              bounds={[
                [base.lat - delta, base.lng - delta],
                [base.lat + delta, base.lng + delta],
              ]}
              fillColor="#29302b"
              fillOpacity={0.9}
              interactive
              key={base.id}
              pathOptions={{ color: "#f7f6f1", weight: 1 }}
            >
              <Tooltip className="map-tooltip" direction="top">
                <div className="tooltip-content compact">
                  <strong>Base {base.name}</strong>
                  <span>{formatNumber(base.trips)} viajes asignados</span>
                </div>
              </Tooltip>
            </Rectangle>
          );
        })}

        {selected?.lat != null && selected?.lng != null && (
          <>
            <Circle
              center={[selected.lat, selected.lng]}
              radius={radiusKm * 1000}
              interactive={false}
              fillColor="#f1642e"
              fillOpacity={0.08}
              pathOptions={{ color: "#f1642e", dashArray: "7 7", weight: 1.7 }}
            />
            {isIntermediateMode && (
              <CircleMarker
                center={[selected.lat, selected.lng]}
                className="intermediate-marker"
                fillColor="#29302b"
                fillOpacity={1}
                pathOptions={{ color: "#ffffff", weight: 3 }}
                radius={10}
              >
                <Tooltip className="map-tooltip" direction="top" offset={[0, -8]} permanent>
                  <div className="tooltip-content compact">
                    <strong>{selected.locality}</strong>
                    <span>Localidad validada · {coveredLocalities.length} nodos por ruta</span>
                  </div>
                </Tooltip>
              </CircleMarker>
            )}
          </>
        )}
        <FreePointPicker enabled={isIntermediateMode} onPlacePoint={onPlacePoint} />
        <MapController selected={selected} />
      </MapContainer>

      <div className="map-legend" aria-label="Leyenda del mapa">
        <div>
          <span className="legend-dot" /> Demanda (km excedentes)
        </div>
        <div className="legend-scale" aria-hidden="true">
          <i /> <i /> <i /> <i />
        </div>
        <div>
          <span className="legend-square" /> Bases existentes
        </div>
        <div>
          <span className="legend-ring" /> Base propuesta
        </div>
        {isIntermediateMode && (
          <div>
            <span className="legend-captured" /> Nodos capturados
          </div>
        )}
      </div>
      {isIntermediateMode && (
        <div className="map-placement-hint">Elegí una zona: se ajustará a una localidad válida</div>
      )}
      <div className={`map-routing-badge is-${routingStatus}`}>
        {routingStatus === "ready" && `${routeLines.length} rutas principales`}
        {routingStatus === "loading" && "Calculando rutas reales…"}
        {routingStatus === "fallback" && "Ruta no disponible · estimación geográfica"}
      </div>
      <div className="map-quality-badge" title="Cobertura geográfica validada">
        {opportunities.filter((item) => item.lat != null && item.lng != null).length}/{opportunities.length} ubicadas
      </div>
    </section>
  );
}
