"use client";

import { useEffect, useRef, useState } from "react";
import type {
  createFireworksScene,
  FireworksAssets,
} from "@/lib/fireworks-scene";

const sky = "/media/decorative/hero-fireworks-sky-v1.webp";
const atlas = "/media/decorative/hero-fireworks-atlas-v1.webp";

export function HeroFireworks() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ReturnType<typeof createFireworksScene>>(null);
  const assetsRef = useRef<FireworksAssets | null>(null);
  const createScene = useRef<typeof createFireworksScene | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(preference.matches);
    syncPreference();
    preference.addEventListener("change", syncPreference);

    let inViewport = false;
    const syncVisibility = () => setVisible(inViewport && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      syncVisibility();
    });
    observer.observe(stage);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      preference.removeEventListener("change", syncPreference);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion || !visible || assetsReady) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const skyImage = new window.Image();
        const atlasImage = new window.Image();
        skyImage.src = sky;
        atlasImage.src = atlas;
        const [scene] = await Promise.all([
          import("@/lib/fireworks-scene"),
          skyImage.decode(),
          atlasImage.decode(),
        ]);
        if (!cancelled) {
          assetsRef.current = { sky: skyImage, atlas: atlasImage };
          createScene.current = scene.createFireworksScene;
          setAssetsReady(true);
        }
      } catch {
        // Preserve the original illustration if either generated asset fails.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [reducedMotion, visible, assetsReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const assets = assetsRef.current;
    if (
      !canvas ||
      !assetsReady ||
      !assets ||
      reducedMotion ||
      !createScene.current
    )
      return undefined;
    try {
      controller.current = createScene.current(canvas, assets);
      setRendered(controller.current !== null);
    } catch {
      setRendered(false);
    }
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, [assetsReady, reducedMotion]);

  const active = assetsReady && rendered && !reducedMotion;
  const playing = active && visible && !paused;
  useEffect(() => {
    controller.current?.setPlaying(playing);
  }, [playing]);

  return (
    <>
      <div
        ref={stageRef}
        className="brand-fireworks"
        aria-hidden="true"
        data-ready={active}
        data-playing={playing}
      >
        {assetsReady && !reducedMotion && (
          <canvas ref={canvasRef} className="brand-fireworks-canvas" />
        )}
      </div>
      {active && (
        <button
          className="brand-fireworks-toggle"
          type="button"
          aria-label={paused ? "Reanudar animación" : "Pausar animación"}
          onClick={() => setPaused((value) => !value)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            {paused ? (
              <path d="M4 2.5 13 8l-9 5.5Z" />
            ) : (
              <path d="M4 3h3v10H4zm5 0h3v10H9z" />
            )}
          </svg>
          <span>{paused ? "Reanudar" : "Pausar"}</span>
        </button>
      )}
    </>
  );
}
