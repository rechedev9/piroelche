"use client";
import Image from "next/image";
import { useState } from "react";

export function Media({
  src,
  alt,
  ratio = "4 / 3",
  dark = false,
  className = "",
  fit,
}: {
  src?: string | null;
  alt: string;
  ratio?: string;
  dark?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`media ${dark ? "media-dark" : ""} ${fit === "contain" ? "media-contain" : ""} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          style={fit ? { objectFit: fit } : undefined}
          sizes="(max-width: 650px) 90vw, (max-width: 1059px) 45vw, 560px"
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
