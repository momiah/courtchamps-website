import { useEffect } from "react";

export const SITE_URL = "https://courtchamps.com";

type PageMeta = {
  title: string;
  description?: string;
  // Path for the canonical URL, e.g. "/players". Omit on pages without one.
  path?: string;
  // Keep the page out of search results (logins, invites, admin, etc.).
  noindex?: boolean;
};

const metaSelectors = {
  description: 'meta[name="description"]',
  ogTitle: 'meta[property="og:title"]',
  ogDescription: 'meta[property="og:description"]',
  ogUrl: 'meta[property="og:url"]',
  twitterTitle: 'meta[name="twitter:title"]',
  twitterDescription: 'meta[name="twitter:description"]',
};

const getContent = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(selector)?.content ?? "";

const setContent = (selector: string, content: string) => {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
};

// The tags in public/index.html are the site-wide defaults. Read them once at
// startup so every page can fall back to them when it unmounts.
const defaults = {
  title: document.title,
  description: getContent(metaSelectors.description),
  ogUrl: getContent(metaSelectors.ogUrl),
};

const setCanonical = (href: string | null) => {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!href) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
};

const setNoindex = (noindex: boolean) => {
  let robots = document.head.querySelector<HTMLMetaElement>(
    'meta[name="robots"]',
  );
  if (!noindex) {
    robots?.remove();
    return;
  }
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.appendChild(robots);
  }
  robots.content = "noindex";
};

const apply = ({
  title,
  description,
  url,
  noindex,
}: {
  title: string;
  description: string;
  url: string | null;
  noindex: boolean;
}) => {
  document.title = title;
  setContent(metaSelectors.description, description);
  setContent(metaSelectors.ogTitle, title);
  setContent(metaSelectors.ogDescription, description);
  setContent(metaSelectors.twitterTitle, title);
  setContent(metaSelectors.twitterDescription, description);
  setContent(metaSelectors.ogUrl, url ?? defaults.ogUrl);
  setCanonical(url);
  setNoindex(noindex);
};

export function usePageMeta({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    apply({
      title,
      description: description ?? defaults.description,
      url: path === undefined ? null : `${SITE_URL}${path}`,
      noindex: !!noindex,
    });
    return () =>
      apply({
        title: defaults.title,
        description: defaults.description,
        url: null,
        noindex: false,
      });
  }, [title, description, path, noindex]);
}
