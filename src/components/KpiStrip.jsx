import { CarFront, MapPin, Route, TrendingDown } from "lucide-react";
import { formatNumber, formatPercent } from "../lib/format";

export default function KpiStrip({ meta, savingsKm }) {
  const savingsPercent = meta.totalExcessKm ? (savingsKm / meta.totalExcessKm) * 100 : 0;
  const items = [
    { icon: CarFront, value: formatNumber(meta.totalTrips), label: "viajes" },
    { icon: Route, value: formatNumber(meta.totalExcessKm), label: "km excedentes" },
    { icon: MapPin, value: formatNumber(meta.analyzedLocalities), label: "localidades" },
    {
      icon: TrendingDown,
      value: savingsKm ? formatPercent(savingsPercent) : "—",
      label: "ahorro potencial",
    },
  ];

  return (
    <section className="kpi-strip" aria-label="Resumen del período">
      {items.map(({ icon: Icon, value, label }) => (
        <div className="kpi-item" key={label}>
          <Icon aria-hidden="true" size={27} strokeWidth={1.65} />
          <div>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
