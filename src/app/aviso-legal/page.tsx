import { LegalPage } from "@/components/legal-page";
import { pageMetadata } from "@/lib/seo";
export const metadata = {
  ...pageMetadata(
    "Aviso legal",
    "Información sobre el titular, el alcance del sitio y las condiciones de consulta de Piroboom.",
    "/aviso-legal/",
  ),
  robots: { index: false, follow: false },
};
export default function Page() {
  return <LegalPage kind="notice" />;
}
