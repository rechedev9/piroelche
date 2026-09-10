import { Media } from "@/components/media";

export function HeroImage({
  src,
  alt,
  label,
  caption,
}: {
  src?: string | null;
  alt: string;
  label: string;
  caption: string;
}) {
  return (
    <figure className="brand-hero-visual">
      <Media src={src} alt={alt} ratio="4 / 5" fit="cover" dark priority />
      <figcaption className="brand-photo-caption">
        <span>{label}</span>
        {caption}
      </figcaption>
    </figure>
  );
}
