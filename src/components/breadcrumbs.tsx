import Link from "next/link";
import {
  breadcrumbListJsonLd,
  serializeJsonLd,
  type BreadcrumbItem,
} from "@/lib/seo";

export function Breadcrumbs({
  items,
  structuredData = false,
}: {
  items: BreadcrumbItem[];
  structuredData?: boolean;
}) {
  const current = items.length - 1;
  return (
    <>
      <nav aria-label="Ruta" className="breadcrumbs">
        <ol>
          {items.map((item, index) => (
            <li key={`${index}-${item.label}`}>
              {item.href && index !== current ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbListJsonLd(items)),
          }}
        />
      )}
    </>
  );
}
