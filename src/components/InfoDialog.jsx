import { X } from "lucide-react";

export default function InfoDialog({ title, eyebrow, children, onClose, actions }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="info-dialog-title"
        aria-modal="true"
        className="methodology-dialog info-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar">
          <X size={20} />
        </button>
        {eyebrow && <span className="dialog-eyebrow">{eyebrow}</span>}
        <h2 id="info-dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">
          {actions}
          <button className="secondary-button" type="button" onClick={onClose}>Cerrar</button>
        </div>
      </section>
    </div>
  );
}
