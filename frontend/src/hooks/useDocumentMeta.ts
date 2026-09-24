import { useEffect } from "react";

import { SITE_URL } from "@/lib/site";

export interface DocumentMeta {
  /** Full document title; defaults to the title declared in index.html. */
  title?: string;
  /** Meta description; defaults to the one declared in index.html. */
  description?: string;
  /** Meta robots, e.g. "noindex, nofollow"; defaults to index.html's value. */
  robots?: string;
  /** Path of the canonical URL (e.g. "/projects/slug"); defaults to index.html's canonical. */
  canonicalPath?: string;
}

interface Defaults {
  title: string;
  description: string;
  robots: string;
  canonical: string;
}

let defaults: Defaults | null = null;

/** Values from index.html, captured once before any page changes them. */
function getDefaults(): Defaults {
  defaults ??= {
    title: document.title,
    description: readMeta("description") ?? "",
    robots: readMeta("robots") ?? "index, follow",
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href") ?? "",
  };
  return defaults;
}

function readMeta(name: string): string | null {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.getAttribute("content") ?? null;
}

function writeMeta(name: string, content: string): void {
  let element = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.append(element);
  }
  element.content = content;
}

function writeCanonical(href: string): void {
  const element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (element && href) element.href = href;
}

/** Set the document title, meta description, robots directive and canonical URL for a page. */
export function useDocumentMeta({ title, description, robots, canonicalPath }: DocumentMeta): void {
  useEffect(() => {
    const base = getDefaults();
    document.title = title ?? base.title;
    writeMeta("description", description ?? base.description);
    writeMeta("robots", robots ?? base.robots);
    writeCanonical(canonicalPath !== undefined && SITE_URL ? `${SITE_URL}${canonicalPath}` : base.canonical);
  }, [title, description, robots, canonicalPath]);
}
