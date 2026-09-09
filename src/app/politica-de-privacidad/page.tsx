import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = {
  ...pageMetadata(
    "Política de privacidad",
    "Información del tratamiento de consultas y borradores en la versión de Piroboom.",
    "/politica-de-privacidad/",
  ),
  robots: { index: false, follow: false },
};
export default function Page() {
  return <LegalPage kind="privacy" />;
}
