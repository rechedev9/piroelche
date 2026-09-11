import { z } from "zod";

const text = z.string().trim().min(1);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const DateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "La fecha debe existir en el calendario");

export const EditorialStatusSchema = z.enum([
  "draft",
  "verified",
  "published",
  "archived",
]);
export const ProvenanceSchema = z
  .object({
    kind: z.enum([
      "primary-source",
      "owner-confirmed",
      "handoff-reference",
      "prototype-fixture",
      "editorial",
    ]),
    source: text,
    checkedAt: DateOnlySchema.optional(),
    validUntil: DateOnlySchema.optional(),
    note: text,
    pending: z.array(text).default([]),
    verifiedFields: z.array(text).default([]),
  })
  .strict();

const WebUrlSchema = z
  .url()
  .refine((value) => /^https?:\/\//.test(value), "Solo URLs HTTP(S)");
const AssetUrlSchema = z
  .string()
  .refine(
    (value) =>
      /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\/?$/.test(
        value,
      ),
    "El medio debe tener una ruta local segura; importa los archivos aprobados antes de publicarlos",
  );

export const ImageSchema = z
  .object({
    src: AssetUrlSchema,
    alt: text,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fit: z.enum(["cover", "contain"]).optional(),
    provenance: ProvenanceSchema,
  })
  .strict();
const PublishedImageSchema = ImageSchema.refine(
  (image) =>
    ["primary-source", "owner-confirmed"].includes(image.provenance.kind) &&
    Boolean(image.provenance.checkedAt) &&
    image.provenance.pending.length === 0,
  "Una imagen pública necesita una fuente comprobada y autorización de uso",
);
export const VideoSchema = z
  .object({
    src: AssetUrlSchema,
    poster: AssetUrlSchema.optional(),
    audio: z.enum(["silent", "present"]),
    captions: AssetUrlSchema.optional(),
    caption: text,
    provenance: ProvenanceSchema,
  })
  .strict()
  .superRefine((video, ctx) => {
    if (video.audio === "present" && !video.captions) {
      ctx.addIssue({
        code: "custom",
        path: ["captions"],
        message:
          "Un vídeo con audio necesita una pista de subtítulos local antes de incorporarse al contenido",
      });
    }
  });

export const FamilySchema = z
  .object({
    id: slug,
    slug,
    name: text,
    description: text,
    image: PublishedImageSchema.optional(),
  })
  .strict();

export const ProductSchema = z
  .object({
    ref: z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/),
    slug,
    familyId: slug,
    name: text,
    summary: text,
    description: text,
    attributes: z.array(z.object({ label: text, value: text }).strict()),
    classification: text.optional(),
    age: text.optional(),
    use: text.optional(),
    conditions: text.optional(),
    price: z.number().finite().nonnegative().nullable().optional(),
    availability: z.enum(["unknown", "in-stock", "out-of-stock"]),
    image: ImageSchema.optional(),
    video: VideoSchema.optional(),
    status: EditorialStatusSchema,
    provenance: ProvenanceSchema,
  })
  .strict()
  .superRefine((product, ctx) => {
    if (product.status !== "published" && product.status !== "verified") return;
    const provenance = product.provenance;
    if (
      !["primary-source", "owner-confirmed"].includes(provenance.kind) ||
      !provenance.checkedAt
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message:
          "Una referencia verificada/publicada requiere una fuente comprobada, nunca una fixture",
      });
    }
    const sensitiveFields = ["name", "summary", "description"];
    if (product.attributes.length) sensitiveFields.push("attributes");
    for (const field of [
      "classification",
      "age",
      "use",
      "conditions",
      "price",
    ] as const) {
      if (product[field] != null) sensitiveFields.push(field);
    }
    if (product.availability !== "unknown")
      sensitiveFields.push("availability");
    for (const field of sensitiveFields) {
      if (!provenance.verifiedFields.includes(field)) {
        ctx.addIssue({
          code: "custom",
          path: ["provenance", "verifiedFields"],
          message: `Falta comprobar el campo ${field}`,
        });
      }
    }
    if (product.status === "published" && provenance.pending.length) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "pending"],
        message: "La referencia conserva datos pendientes de publicación",
      });
    }
    for (const field of ["image", "video"] as const) {
      const medium = product[field];
      if (
        medium &&
        (!["primary-source", "owner-confirmed"].includes(
          medium.provenance.kind,
        ) ||
          !medium.provenance.checkedAt ||
          medium.provenance.pending.length)
      ) {
        ctx.addIssue({
          code: "custom",
          path: [field, "provenance"],
          message:
            "El medio necesita procedencia y permisos comprobados para esta referencia",
        });
      }
    }
  });

export const OccasionIdSchema = z.enum([
  "boda",
  "revelacion",
  "cumpleanos",
  "fiesta",
  "otra",
]);
export const OccasionSchema = z
  .object({ id: OccasionIdSchema, label: text })
  .strict();
export const SolutionSchema = z
  .object({
    id: z.enum(["boda", "revelacion", "fiesta"]),
    occasionId: OccasionIdSchema,
    label: text,
    title: text,
    result: text,
    delivery: text,
    needs: text,
    image: PublishedImageSchema.optional(),
    status: EditorialStatusSchema,
    provenance: ProvenanceSchema,
  })
  .strict();
export const CaseSchema = z
  .object({
    id: slug,
    title: text,
    detail: text,
    image: ImageSchema.optional(),
    video: VideoSchema.optional(),
    status: EditorialStatusSchema,
    provenance: ProvenanceSchema,
  })
  .strict()
  .superRefine((item, ctx) => {
    if (
      item.status === "published" &&
      (!item.provenance.checkedAt ||
        !["primary-source", "owner-confirmed"].includes(item.provenance.kind) ||
        item.provenance.pending.length)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message:
          "Un trabajo publicado necesita acreditación y revisión de sus permisos",
      });
    }
    if (item.status === "published") {
      for (const field of ["image", "video"] as const) {
        const medium = item[field];
        if (
          medium &&
          (!["primary-source", "owner-confirmed"].includes(
            medium.provenance.kind,
          ) ||
            !medium.provenance.checkedAt ||
            medium.provenance.pending.length)
        ) {
          ctx.addIssue({
            code: "custom",
            path: [field, "provenance"],
            message:
              "Un caso público no puede incorporar medios de demostración o pendientes de permiso",
          });
        }
      }
    }
  });

const OpeningTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const ClosingTimeSchema = z
  .string()
  .regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/);
export const TimeIntervalSchema = z
  .object({ opens: OpeningTimeSchema, closes: ClosingTimeSchema })
  .strict()
  .refine(
    (interval) => interval.opens < interval.closes,
    "La hora de cierre debe ser posterior; divide los horarios nocturnos entre los dos días",
  );
const IntervalsSchema = z
  .array(TimeIntervalSchema)
  .superRefine((intervals, ctx) => {
    for (let index = 1; index < intervals.length; index++) {
      if (intervals[index - 1].closes > intervals[index].opens) {
        ctx.addIssue({
          code: "custom",
          path: [index],
          message: "Los tramos deben estar ordenados y no solaparse",
        });
      }
    }
  });
export const ScheduleSchema = z
  .array(
    z
      .object({
        days: z.array(z.number().int().min(0).max(6)).min(1),
        intervals: IntervalsSchema,
      })
      .strict(),
  )
  .min(1)
  .max(7)
  .superRefine((schedule, ctx) => {
    const days = schedule.flatMap((row) => row.days);
    if (days.length !== 7 || new Set(days).size !== 7) {
      ctx.addIssue({
        code: "custom",
        message:
          "El horario debe cubrir cada día de la semana exactamente una vez (0=domingo)",
      });
    }
  });
export const HoursExceptionSchema = z
  .object({
    date: DateOnlySchema,
    intervals: IntervalsSchema,
    reason: text.optional(),
    confirmed: z.boolean(),
  })
  .strict();
export const CampaignPeriodSchema = z
  .object({
    startsOn: DateOnlySchema.optional(),
    endsOn: DateOnlySchema.optional(),
    confirmed: z.boolean(),
    confirmedUntil: DateOnlySchema.optional(),
  })
  .strict()
  .superRefine((campaign, ctx) => {
    if (
      campaign.confirmed &&
      (!campaign.startsOn || !campaign.endsOn || !campaign.confirmedUntil)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Una campaña confirmada necesita inicio, fin y fecha de caducidad de la confirmación",
      });
    }
    if (
      campaign.startsOn &&
      campaign.endsOn &&
      campaign.startsOn > campaign.endsOn
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endsOn"],
        message: "El fin de campaña debe ser posterior o igual al inicio",
      });
    }
  });
const hoursFields = {
  schedule: ScheduleSchema,
  exceptions: z
    .array(HoursExceptionSchema)
    .refine(
      (exceptions) =>
        new Set(exceptions.map((item) => item.date)).size === exceptions.length,
      "Solo puede existir una excepción por fecha",
    ),
  confirmedUntil: DateOnlySchema.optional(),
  exceptionsConfirmedUntil: DateOnlySchema.optional(),
};
/** Structured address for schema.org; the display string stays in `address`. */
export const PostalAddressSchema = z
  .object({
    streetAddress: text,
    postalCode: z.string().regex(/^\d{5}$/),
    addressLocality: text,
    addressRegion: text,
    addressCountry: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
export const GeoSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .strict();
export const StoreSchema = z
  .object({
    name: text,
    address: text,
    postalAddress: PostalAddressSchema.optional(),
    geo: GeoSchema.optional(),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    phoneDisplay: text,
    landline: z
      .object({
        phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
        phoneDisplay: text,
      })
      .strict()
      .optional(),
    directionsUrl: WebUrlSchema,
    image: ImageSchema.optional(),
    ...hoursFields,
    provenance: ProvenanceSchema,
  })
  .strict()
  .superRefine((store, ctx) => {
    if (store.provenance.kind === "prototype-fixture") {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message:
          "La tienda permanente compartida no puede usar los datos de ejemplo del prototipo",
      });
    }
    if (
      store.image &&
      (!["primary-source", "owner-confirmed"].includes(
        store.image.provenance.kind,
      ) ||
        !store.image.provenance.checkedAt ||
        store.image.provenance.pending.length)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["image", "provenance"],
        message:
          "La foto de acceso necesita procedencia y permisos comprobados",
      });
    }
  });
export const CampaignSchema = z
  .object({
    id: slug,
    name: text,
    address: text,
    directionsUrl: WebUrlSchema.optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/)
      .optional(),
    ...hoursFields,
    campaign: CampaignPeriodSchema,
    status: EditorialStatusSchema,
    provenance: ProvenanceSchema,
  })
  .strict()
  .superRefine((item, ctx) => {
    if (
      item.status === "published" &&
      (!["primary-source", "owner-confirmed"].includes(item.provenance.kind) ||
        !item.provenance.checkedAt)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["provenance"],
        message: "Un punto de campaña publicado necesita datos contrastados",
      });
    }
  });

export const PdfSchema = z
  .object({
    url: z
      .union([
        WebUrlSchema,
        z
          .string()
          .regex(
            /^\/catalogos\/[a-zA-Z0-9_-]+\.pdf$/,
            "El PDF local debe ser un archivo .pdf dentro de /catalogos/",
          ),
      ])
      .nullable(),
    status: z.enum(["unavailable", "external", "verified"]),
    edition: text.optional(),
    sizeBytes: z.number().int().positive().optional(),
    provenance: ProvenanceSchema,
  })
  .strict()
  .superRefine((pdf, ctx) => {
    if (pdf.status !== "unavailable" && !pdf.url)
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: "El PDF enlazable necesita URL",
      });
    if (pdf.status !== "verified" && (pdf.edition || pdf.sizeBytes))
      ctx.addIssue({
        code: "custom",
        message:
          "La edición y el tamaño requieren recuperar y comprobar el documento",
      });
    if (pdf.status === "verified" && !pdf.provenance.checkedAt)
      ctx.addIssue({
        code: "custom",
        path: ["provenance", "checkedAt"],
        message: "Falta la fecha de comprobación del PDF",
      });
  });
export const LegalPageSchema = z
  .object({
    title: text,
    updatedAt: DateOnlySchema,
    sections: z
      .array(
        z.object({ heading: text, paragraphs: z.array(text).min(1) }).strict(),
      )
      .min(1),
    status: EditorialStatusSchema,
    provenance: ProvenanceSchema,
  })
  .strict();
export const ChannelsSchema = z
  .object({
    whatsapp: z
      .object({
        enabled: z.boolean(),
        url: WebUrlSchema.nullable(),
        reviewedAt: DateOnlySchema.optional(),
        reviewNote: text,
      })
      .strict()
      .superRefine((channel, ctx) => {
        if (channel.enabled && (!channel.url || !channel.reviewedAt))
          ctx.addIssue({
            code: "custom",
            message:
              "WhatsApp requiere destino y revisión explícita antes de activarse",
          });
      }),
    email: z.email().nullable(),
    social: z
      .object({
        facebook: z
          .object({ label: text, url: WebUrlSchema })
          .strict()
          .nullable(),
        instagram: z
          .object({
            handle: z.string().regex(/^[a-z0-9._]+$/i),
            url: WebUrlSchema,
          })
          .strict()
          .nullable(),
      })
      .strict(),
  })
  .strict();

export const ContentSchema = z
  .object({
    brand: z
      .object({
        hero: PublishedImageSchema,
        eventHero: PublishedImageSchema,
        storeWelcome: PublishedImageSchema,
        storeDetail: PublishedImageSchema,
        gallery: z.array(PublishedImageSchema),
      })
      .strict()
      .optional(),
    families: z.array(FamilySchema),
    products: z.array(ProductSchema),
    solutions: z.array(SolutionSchema),
    occasions: z.array(OccasionSchema),
    cases: z.array(CaseSchema),
    store: StoreSchema,
    campaigns: z.array(CampaignSchema),
    pdf: PdfSchema,
    legal: z
      .object({
        notice: LegalPageSchema,
        privacy: LegalPageSchema,
        cookies: LegalPageSchema,
      })
      .strict(),
    channels: ChannelsSchema,
  })
  .strict()
  .superRefine((content, ctx) => {
    const assertUnique = (items: string[], path: string) => {
      if (new Set(items).size !== items.length)
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: "Los identificadores y slugs deben ser únicos",
        });
    };
    assertUnique(
      content.families.map((item) => item.id),
      "families",
    );
    assertUnique(
      content.families.map((item) => item.slug),
      "families",
    );
    assertUnique(
      content.products.map((item) => item.ref),
      "products",
    );
    assertUnique(
      content.products.map((item) => `${item.familyId}/${item.slug}`),
      "products",
    );
    assertUnique(
      content.solutions.map((item) => item.id),
      "solutions",
    );
    assertUnique(
      content.occasions.map((item) => item.id),
      "occasions",
    );
    assertUnique(
      content.cases.map((item) => item.id),
      "cases",
    );
    assertUnique(
      content.campaigns.map((item) => item.id),
      "campaigns",
    );
    const families = new Set(content.families.map((item) => item.id));
    content.products.forEach((product, index) => {
      if (!families.has(product.familyId))
        ctx.addIssue({
          code: "custom",
          path: ["products", index, "familyId"],
          message: "Familia desconocida",
        });
    });
    const occasions = new Set(content.occasions.map((item) => item.id));
    content.solutions.forEach((solution, index) => {
      if (!occasions.has(solution.occasionId))
        ctx.addIssue({
          code: "custom",
          path: ["solutions", index, "occasionId"],
          message: "Ocasión desconocida",
        });
    });
  });

export const DemoContentSchema = z
  .object({
    products: z.array(ProductSchema),
    cases: z.array(CaseSchema),
    campaigns: z.array(CampaignSchema),
  })
  .strict()
  .superRefine((demo, ctx) => {
    for (const [collection, items] of Object.entries(demo)) {
      items.forEach((item, index) => {
        if (
          item.status !== "draft" ||
          item.provenance.kind !== "prototype-fixture"
        ) {
          ctx.addIssue({
            code: "custom",
            path: [collection, index],
            message: "Las fixtures deben conservar su origen y estado draft",
          });
        }
      });
    }
  });

export type Provenance = z.infer<typeof ProvenanceSchema>;
export type Family = z.infer<typeof FamilySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Video = z.infer<typeof VideoSchema>;
export type Occasion = z.infer<typeof OccasionSchema>;
export type OccasionId = z.infer<typeof OccasionIdSchema>;
export type Solution = z.infer<typeof SolutionSchema>;
export type EventCase = z.infer<typeof CaseSchema>;
export type TimeInterval = z.infer<typeof TimeIntervalSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type HoursException = z.infer<typeof HoursExceptionSchema>;
export type CampaignPeriod = z.infer<typeof CampaignPeriodSchema>;
export type Store = z.infer<typeof StoreSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type Channels = z.infer<typeof ChannelsSchema>;
export type LegalPage = z.infer<typeof LegalPageSchema>;
export type SiteContent = z.infer<typeof ContentSchema>;
export type PublicContent = SiteContent & { isDemo: boolean };

/** Apply editorial visibility after schema validation; a draft is never a public fallback. */
export function selectPublishedContent(
  content: SiteContent,
  date: string,
): SiteContent {
  const isPublic = (item: { status: string; provenance: Provenance }) =>
    item.status === "published" &&
    item.provenance.kind !== "prototype-fixture" &&
    (!item.provenance.validUntil || item.provenance.validUntil >= date);
  return {
    ...content,
    products: content.products.filter(isPublic),
    solutions: content.solutions.filter(isPublic),
    cases: content.cases.filter(isPublic),
    campaigns: content.campaigns.filter(isPublic),
  };
}
