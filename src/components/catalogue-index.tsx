"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cataloguePages, cataloguePageHref } from "@/lib/catalogue";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function CatalogueIndex({ selectedPage }: { selectedPage: number }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const enhanced = useSyncExternalStore(
    subscribeToHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const navigation = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const results = cataloguePages.filter((page) => {
    const text = normalizeSearch(
      `${page.page} ${page.title} ${page.description} ${page.text}`,
    );
    return terms.every((term) => text.includes(term));
  });

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const update = () => setOpen(desktop.matches);
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const nav = navigation.current;
    const current = nav?.querySelector<HTMLElement>(
      `a[href="${cataloguePageHref(selectedPage)}"]`,
    );
    if (nav && current && open) {
      const offset =
        current.getBoundingClientRect().top - nav.getBoundingClientRect().top;
      if (offset < 0 || offset + current.offsetHeight > nav.clientHeight) {
        nav.scrollTop += offset - (nav.clientHeight - current.offsetHeight) / 2;
      }
    }
    // Filtering changes the active thumbnail's position in the rendered list.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [selectedPage, open, query]);

  return (
    <details
      className="catalogue-index"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>Índice del catálogo</span>
        <span className="catalogue-index-count">
          {cataloguePages.length} páginas
        </span>
      </summary>
      {enhanced && (
        <div className="catalogue-search">
          <label htmlFor="catalogue-search">Buscar en el catálogo</label>
          <div className="catalogue-search-field">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              ref={search}
              id="catalogue-search"
              type="search"
              placeholder="Nombre, efecto, sección…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <p aria-live="polite" aria-atomic="true">
            {terms.length
              ? `${results.length} ${results.length === 1 ? "página encontrada" : "páginas encontradas"}`
              : "Elige una página para empezar"}
          </p>
        </div>
      )}
      <nav ref={navigation} aria-label="Páginas del catálogo">
        <ol>
          {results.map((page) => (
            <li key={page.page}>
              <Link
                href={cataloguePageHref(page.page)}
                prefetch={false}
                aria-current={selectedPage === page.page ? "page" : undefined}
                onClick={(event) => {
                  if (window.matchMedia("(max-width: 760px)").matches) {
                    setOpen(false);
                    event.currentTarget
                      .closest("details")
                      ?.querySelector("summary")
                      ?.focus();
                  }
                }}
              >
                <Image
                  src={page.thumb}
                  alt=""
                  width={32}
                  height={56}
                  sizes="32px"
                />
                <span>
                  <small>Página {String(page.page).padStart(2, "0")}</small>
                  {page.title}
                </span>
                <span className="catalogue-index-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      {results.length === 0 && (
        <div className="catalogue-search-empty">
          <p>
            No encontramos ese término. Prueba con «humo», «fuentes» o el nombre
            de un artículo.
          </p>
          <Button
            variant="plain"
            onClick={() => {
              setQuery("");
              search.current?.focus();
            }}
          >
            Limpiar búsqueda
          </Button>
        </div>
      )}
    </details>
  );
}
