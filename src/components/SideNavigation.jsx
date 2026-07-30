import {
  BarChart3,
  Building2,
  ChevronLeft,
  ClipboardList,
  MapPinned,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";

export const navigationItems = [
  { label: "Planificación", icon: MapPinned },
  { label: "Operaciones", icon: SlidersHorizontal },
  { label: "Viajes", icon: ClipboardList },
  { label: "Bases", icon: Building2 },
  { label: "Reportes", icon: BarChart3 },
  { label: "Configuración", icon: Settings },
];

export default function SideNavigation({
  activeSection,
  collapsed,
  mobileOpen,
  onCollapse,
  onCloseMobile,
  onNavigate,
}) {
  function navigate(label) {
    onNavigate(label);
    onCloseMobile?.();
  }

  return (
    <>
      {mobileOpen && <button className="mobile-nav-backdrop" type="button" aria-label="Cerrar menú" onClick={onCloseMobile} />}
      <aside
        className={`side-navigation${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
        aria-label="Navegación principal"
      >
        <div className="mobile-nav-heading">
          <div className="brand" aria-label="Nodo">Nodo<span>.</span></div>
          <button type="button" aria-label="Cerrar menú" onClick={onCloseMobile}><X size={20} /></button>
        </div>
        <nav>
          {navigationItems.map(({ label, icon: Icon }) => (
            <button
              aria-current={activeSection === label ? "page" : undefined}
              className={activeSection === label ? "nav-item is-active" : "nav-item"}
              key={label}
              onClick={() => navigate(label)}
              title={collapsed ? label : undefined}
              type="button"
            >
              <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="collapse-button" type="button" aria-label="Alternar navegación" onClick={onCollapse}>
          <ChevronLeft className={collapsed ? "is-rotated" : ""} size={18} />
          <span>{collapsed ? "Expandir" : "Colapsar"}</span>
        </button>
      </aside>
    </>
  );
}
