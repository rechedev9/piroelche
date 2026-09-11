"use client";
import Image from "next/image";
import { useState, type CSSProperties } from "react";

/** Lets the ratio travel as a custom property instead of an inline
 *  `aspect-ratio`, which stylesheet rules could not override by specificity. */
interface MediaStyle extends CSSProperties {
  "--media-ratio": string;
}

export function Media({
  src,
  alt,
  ratio = "4 / 3",
  dark = false,
  className = "",
  fit,
  priority = false,
  sizes = "(max-width: 650px) 90vw, (max-width: 1059px) 45vw, 560px",
}: {
  src?: string | null;
  alt: string;
  ratio?: string;
  dark?: boolean;
  className?: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  /** Rendered width hints; the default fits two-column layouts. Card grids
   *  with three or four columns should pass a narrower desktop width. */
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style: MediaStyle = { "--media-ratio": ratio };
  return (
    <div
      className={`media ${dark ? "media-dark" : ""} ${fit === "contain" ? "media-contain" : ""} ${className}`}
      style={style}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          style={fit ? { objectFit: fit } : undefined}
          sizes={sizes}
          // Next 16 renamed the LCP hint: `priority` is deprecated in favour of
          // `preload`, which also loads the image eagerly.
          preload={priority}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="media-note">Imagen no disponible</span>
      )}
    </div>
  );
}

export function ProductVideo({
  src,
  poster,
  caption,
  captions,
}: {
  src?: string | null;
  poster?: string | null;
  caption?: string;
  captions?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <p className="empty-media">
        {failed
          ? "No se ha podido cargar el vídeo. Puedes consultar este artículo por teléfono o formulario."
          : "Vídeo del efecto no disponible para esta referencia."}
      </p>
    );
  return (
    <figure className="video-container">
      <video
        src={src}
        controls
        muted
        preload="none"
        poster={poster || undefined}
        playsInline
        onError={() => setFailed(true)}
        aria-label={caption || "Vídeo del artículo, reproducción manual"}
      >
        {captions && (
          <track
            kind="captions"
            src={captions}
            srcLang="es"
            label="Español"
            default
          />
        )}
        <p>Tu navegador no puede reproducir este vídeo.</p>
      </video>
      <figcaption>
        {caption ||
          "Reproducción manual. Consulta las condiciones de la referencia antes de su uso."}
      </figcaption>
    </figure>
  );
}
