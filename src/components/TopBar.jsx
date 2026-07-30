import { Bell, CircleHelp, Menu, UserRound } from "lucide-react";

export default function TopBar({ onToggleMenu, onShowNotifications, onShowHelp, hasNotifications = false }) {
  return (
    <header className="desktop-topbar">
      <div className="topbar-brand-group">
        <button type="button" aria-label="Alternar menú principal" onClick={onToggleMenu}>
          <Menu size={21} />
        </button>
        <div className="brand">Nodo<span>.</span></div>
      </div>
      <div className="topbar-actions">
        <button
          className={hasNotifications ? "icon-button has-indicator" : "icon-button"}
          type="button"
          aria-label="Notificaciones"
          onClick={onShowNotifications}
        >
          <Bell size={19} />
        </button>
        <button className="icon-button" type="button" aria-label="Ayuda" onClick={onShowHelp}>
          <CircleHelp size={19} />
        </button>
        <div className="operator-copy"><strong>Operaciones</strong><span>Gerencia</span></div>
        <div className="operator-avatar" aria-hidden="true"><UserRound size={19} /></div>
      </div>
    </header>
  );
}
