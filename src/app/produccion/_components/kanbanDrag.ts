export interface KanbanDragDestination {
  destination: string;
  multiple: boolean;
}

export interface KanbanDragInfo {
  pedidoId: string;
  hasMultiple: boolean;
  fromArea: string;
  destinations: KanbanDragDestination[];
}

const store: { current: KanbanDragInfo | null } = { current: null };

export function setKanbanDrag(info: KanbanDragInfo | null): void {
  store.current = info;
}

export function getKanbanDrag(): KanbanDragInfo | null {
  return store.current;
}

export function isValidKanbanDrop(
  info: KanbanDragInfo | null,
  areaId: string,
): boolean {
  if (!info || info.destinations.length === 0) return false;
  return info.destinations.some((d) => d.destination === areaId);
}
