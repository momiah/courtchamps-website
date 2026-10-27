/* eslint-disable testing-library/no-node-access -- these tests check <head> tags, which Testing Library queries do not cover */
import { renderHook } from "@testing-library/react";

// usePageMeta reads the index.html defaults when it is first imported, so set
// the head up before loading it.
document.head.innerHTML = `
  <title>Default title</title>
  <meta name="description" content="Default description" />
  <meta property="og:title" content="Default title" />
  <meta property="og:description" content="Default description" />
  <meta property="og:url" content="https://courtchamps.com/" />
  <meta name="twitter:title" content="Default title" />
  <meta name="twitter:description" content="Default description" />
`;
document.title = "Default title";

const { usePageMeta } = require("./usePageMeta");

const content = (selector: string) =>
  document.head.querySelector<HTMLMetaElement>(selector)?.content;
const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;

describe("usePageMeta", () => {
  it("sets title, description, social tags and canonical for an indexable page", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({
        title: "Players | Court Champs",
        description: "Rankings",
        path: "/players",
      }),
    );

    expect(document.title).toBe("Players | Court Champs");
    expect(content('meta[name="description"]')).toBe("Rankings");
    expect(content('meta[property="og:title"]')).toBe("Players | Court Champs");
    expect(content('meta[name="twitter:description"]')).toBe("Rankings");
    expect(content('meta[property="og:url"]')).toBe("https://courtchamps.com/players");
    expect(canonical()).toBe("https://courtchamps.com/players");
    expect(content('meta[name="robots"]')).toBeUndefined();

    unmount();
  });

  it("marks noindex pages and gives them no canonical", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "Sign In | Court Champs", noindex: true }),
    );

    expect(content('meta[name="robots"]')).toBe("noindex");
    expect(canonical()).toBeUndefined();
    expect(content('meta[name="description"]')).toBe("Default description");

    unmount();
  });

  it("restores the index.html defaults when the page unmounts", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "Join | Court Champs", path: "/x", noindex: true }),
    );
    unmount();

    expect(document.title).toBe("Default title");
    expect(content('meta[property="og:url"]')).toBe("https://courtchamps.com/");
    expect(content('meta[name="robots"]')).toBeUndefined();
    expect(canonical()).toBeUndefined();
  });
});
