import { getContent } from "../src/lib/content";
const content = getContent();
if (process.env.PIROBOOM_PUBLIC_SITE === "1") {
  if (content.isDemo) throw new Error("Una demostración no se puede publicar.");
  for (const page of Object.values(content.legal))
    if (page.status !== "published")
      throw new Error(
        "La publicación necesita textos legales confirmados por el titular.",
      );
}
console.log(
  `Contenido válido: ${content.families.length} familias, ${content.products.length} referencias, demo=${content.isDemo}.`,
);
