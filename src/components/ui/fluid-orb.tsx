"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  createFluidOrbScene,
  type FluidOrbController,
} from "@/lib/fluid-orb-scene";

// The wrapper's ref is owned internally (visibility observer), so callers
// cannot pass one: spreading it over `stageRef` would silently stop the orb.
export type FluidOrbProps = Omit<React.ComponentProps<"div">, "ref"> & {
  /** Rendered size in CSS pixels. */
  size?: number;
  /** `#hex` or a `--token` from globals.css; defaults to the brand magenta. */
  color?: string;
  /** Seconds offset so several orbs do not drift in lockstep. */
  phase?: number;
};

/**
 * Decorative drifting colour orb (WebGL). Purely presentational: hidden from
 * assistive tech, animates only while on screen and never when the visitor
 * prefers reduced motion (a single still frame is drawn instead).
 */
export function FluidOrb({
  size = 240,
  color = "--magenta",
  phase = 0,
  className,
  style,
  ...props
}: FluidOrbProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controller = useRef<FluidOrbController>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

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
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    controller.current = createFluidOrbScene(canvas, { size, color, phase });
    setReady(controller.current !== null);
    return () => {
      controller.current?.dispose();
      controller.current = null;
    };
  }, [size, color, phase]);

  const playing = ready && visible && !reducedMotion;
  useEffect(() => {
    controller.current?.setPlaying(playing);
  }, [playing]);

  return (
    <div
      ref={stageRef}
      data-slot="fluid-orb"
      data-ready={ready}
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
