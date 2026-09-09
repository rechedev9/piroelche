import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = {
  ...pageMetadata(
    "Política de cookies",
    "Uso de almacenamiento necesario y servicios externos en Piroboom.",
    "/politica-de-cookies/",
  ),
  robots: { index: false, follow: false },
};
export default function Page() {
  return <LegalPage kind="cookies" />;
}
