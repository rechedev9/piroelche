import type { ReactNode } from "react";
import { getContent } from "@/lib/content";
import type { AnalyticsEvent } from "@/lib/analytics";
import { TrackedLink } from "./tracked-link";

const icons = {
  phone: (
    <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z" />
  ),
  whatsapp: (
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.6 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  ),
  mail: (
    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.4l8 5 8-5V7H4Zm16 2.7-8 5-8-5V17h16V9.7Z" />
  ),
  instagram: (
    <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.3-3.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
  ),
  facebook: (
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4A22 22 0 0 0 14.3 4c-2.5 0-4.2 1.5-4.2 4.3v2.5H7.3V14h2.8v8h3.4Z" />
  ),
} as const;

export function ContactIcon({
  name,
  size = 18,
}: {
  name: keyof typeof icons;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      focusable="false"
    >
      {icons[name]}
    </svg>
  );
}

type Channel = {
  key: string;
  href: string;
  icon: keyof typeof icons;
  label: ReactNode;
  ariaLabel: string;
  event: AnalyticsEvent;
  external?: boolean;
  className?: string;
};

/**
 * Direct contact actions shown right under the header on every page so a
 * visitor can call, message or write without scrolling.
 */
export function ContactBar() {
  const { store, channels } = getContent();
  const items: Channel[] = [];
  if (store.landline)
    items.push({
      key: "landline",
      href: `tel:${store.landline.phone}`,
      icon: "phone",
      label: store.landline.phoneDisplay,
      ariaLabel: `Llamar al ${store.landline.phoneDisplay}`,
      event: { name: "click_call" },
    });
  items.push({
    key: "mobile",
    href: `tel:${store.phone}`,
    icon: "phone",
    label: store.phoneDisplay,
    ariaLabel: `Llamar al ${store.phoneDisplay}`,
    event: { name: "click_call" },
  });
  if (channels.whatsapp.enabled && channels.whatsapp.url)
    items.push({
      key: "whatsapp",
      href: channels.whatsapp.url,
      icon: "whatsapp",
      label: "WhatsApp",
      ariaLabel: "Escribir por WhatsApp, nueva pestaña",
      event: { name: "click_whatsapp" },
      external: true,
      className: "is-whatsapp",
    });
  if (channels.email)
    items.push({
      key: "email",
      href: `mailto:${channels.email}`,
      icon: "mail",
      label: channels.email,
      ariaLabel: `Enviar correo a ${channels.email}`,
      event: { name: "click_email" },
      className: "is-email",
    });
  if (channels.social.instagram)
    items.push({
      key: "instagram",
      href: channels.social.instagram.url,
      icon: "instagram",
      label: channels.social.instagram.handle,
      ariaLabel: "Instagram de Piroboom, nueva pestaña",
      event: { name: "click_social" },
      external: true,
      className: "is-social",
    });
  if (channels.social.facebook)
    items.push({
      key: "facebook",
      href: channels.social.facebook.url,
      icon: "facebook",
      label: channels.social.facebook.label,
      ariaLabel: "Facebook de Piroboom, nueva pestaña",
      event: { name: "click_social" },
      external: true,
      className: "is-social",
    });
  return (
    <aside className="contact-bar" aria-label="Contacto directo">
      <div className="container contact-bar-inner">
        <p className="contact-bar-claim">
          <strong>Pide por teléfono</strong> y no hagas cola
        </p>
        <ul className="contact-bar-list">
          {items.map((item) => (
            <li key={item.key}>
              <TrackedLink
                href={item.href}
                event={item.event}
                aria-label={item.ariaLabel}
                className={`contact-bar-link${item.className ? ` ${item.className}` : ""}`}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
              >
                <ContactIcon name={item.icon} />
                <span className="contact-bar-label">{item.label}</span>
              </TrackedLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
