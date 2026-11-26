export function EligibilityBadge({ value }: { value: string | null }) {
  const v = value || "YELLOW";
  return <span className={`badge ${v === "RED" ? "red" : v === "GREEN" ? "green" : "yellow"}`}>{v}</span>;
}

export function StatusBadge({ value }: { value: string }) {
  const color = value === "CONFIRMED" ? "green" : value === "REJECTED" ? "red" : value === "WAITING_LIST" ? "yellow" : "blue";
  return <span className={`badge ${color}`}>{value.replaceAll("_", " ")}</span>;
}
