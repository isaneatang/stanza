import { useSyncExternalStore } from "react";
import { archiveStore, type ArchiveState } from "../lib/store";

export function useArchive(): ArchiveState {
  return useSyncExternalStore(archiveStore.subscribe, archiveStore.getState, archiveStore.getState);
}
