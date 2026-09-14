"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { eventRequestHref, navigation } from "@/lib/navigation";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = header.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--header-height",
        `${element.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [open]);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1060px)");
    const closeAtDesktop = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", closeAtDesktop);
    return () => query.removeEventListener("change", closeAtDesktop);
  }, []);
  return (
    <header ref={header} className="site-header">
      <div className="container header-inner">
        <Link
          href="/"
          aria-label="Piroboom, inicio"
          className="brand"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/brand/logo-header.webp"
            alt="Piroboom, pirotecnia en Elche"
            width={680}
            height={276}
            sizes="(max-width: 650px) 160px, 200px"
            preload
          />
        </Link>
        <Button
          variant="unstyled"
          className="menu-toggle"
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="principal"
          onClick={() => setOpen(!open)}
        >
          {open ? "Cerrar" : "Menú"}{" "}
          <span aria-hidden="true">{open ? "×" : "☰"}</span>
        </Button>
        <nav
          id="principal"
          className={`main-nav${open ? " is-open" : ""}`}
          aria-label="Principal"
        >
          {navigation.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            );
          })}
          <Button asChild variant="yellow" className="mobile-event">
            <Link href={eventRequestHref()} onClick={() => setOpen(false)}>
              Planificar mi evento
            </Link>
          </Button>
        </nav>
        <Button asChild variant="light-outline" className="header-event">
          <Link href={eventRequestHref()}>Planificar mi evento</Link>
        </Button>
      </div>
    </header>
  );
}
