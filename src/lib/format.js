export const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export const decimalFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatNumber(value) {
  return numberFormatter.format(Math.round(Number(value) || 0));
}

export function formatPercent(value) {
  return `${decimalFormatter.format(Number(value) || 0)}%`;
}
