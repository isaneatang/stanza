import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useArchive } from "../hooks/useArchive";
import { useMyAddress } from "../hooks/useWallet";

export interface PendingPost {
  tempKey: string;
  author: string;
  title: string;
  content: string;
  license: number;
  status: "pending" | "error";
  error?: string;
}

interface PendingContextValue {
  posts: PendingPost[];
  addPending: (p: Omit<PendingPost, "tempKey" | "status">) => string;
  markError: (key: string, message: string) => void;
  dismiss: (key: string) => void;
}

const PendingContext = createContext<PendingContextValue>({
  posts: [],
  addPending: () => "",
  markError: () => {},
  dismiss: () => {}
});

export function PendingProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const archive = useArchive();

  useEffect(() => {
    setPosts((prev) => {
      const next = prev.filter(
        (p) =>
          p.status === "error" ||
          !archive.poems.some((m) => m.author === p.author && m.content === p.content)
      );
      return next.length === prev.length ? prev : next;
    });
  }, [archive.poems]);

  const addPending = useCallback((p: Omit<PendingPost, "tempKey" | "status">) => {
    const key = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPosts((prev) => [{ ...p, tempKey: key, status: "pending" }, ...prev]);
    return key;
  }, []);

  const markError = useCallback((key: string, message: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.tempKey === key ? { ...p, status: "error", error: message } : p))
    );
  }, []);

  const dismiss = useCallback((key: string) => {
    setPosts((prev) => prev.filter((p) => p.tempKey !== key));
  }, []);

  const value = useMemo(() => ({ posts, addPending, markError, dismiss }), [posts, addPending, markError, dismiss]);

  return <PendingContext.Provider value={value}>{children}</PendingContext.Provider>;
}

export function useMyPendingPosts(): PendingPost[] {
  const ctx = useContext(PendingContext);
  const me = useMyAddress();
  return ctx.posts.filter((p) => !me || p.author === me);
}

export function usePendingActions() {
  return useContext(PendingContext);
}
