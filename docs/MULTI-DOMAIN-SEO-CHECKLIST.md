# Multi-Domain SEO Checklist

Use this checklist right after deploying the domain-per-locale setup.

## 1) Domain and DNS

- `creadordejocs.cat`, `creadordejuegos.com`, and `simplegamecreator.com` are all attached to the same Vercel project.
- DNS nameservers are propagated and each domain resolves in browser.
- SSL certificates are active for all domains.

## 2) Redirect Validation (legacy locale paths)

Run:

```bash
curl -I "https://creadordejocs.cat/es"
curl -I "https://creadordejocs.cat/es/editor"
curl -I "https://creadordejocs.cat/en"
curl -I "https://creadordejocs.cat/en/editor"
```

Expected:

- HTTP status is `301`/`308` permanent redirect.
- `Location` points to:
  - `https://creadordejuegos.com/...` for `/es/*`
  - `https://simplegamecreator.com/...` for `/en/*`

## 3) Canonical and Hreflang

Check page source of:

- `https://creadordejocs.cat/`
- `https://creadordejuegos.com/`
- `https://simplegamecreator.com/`

Expected:

- Canonical points to the current domain URL.
- `hreflang` includes `ca`, `es`, `en`, and `x-default`.
- `hreflang` URLs map to equivalent route on each domain.

## 4) Sitemap

- Open `https://creadordejocs.cat/sitemap.xml`.
- Confirm `<loc>` entries include all three domains.
- Confirm each `<url>` block includes `xhtml:link` alternates with `ca`, `es`, `en`, and `x-default`.

## 5) Google Search Console

- Add or validate domain properties for:
  - `creadordejocs.cat`
  - `creadordejuegos.com`
  - `simplegamecreator.com`
- Submit sitemap for each domain property.
- Use URL Inspection on `/` and `/editor` for each domain.

## 6) Monitoring (first 2-4 weeks)

- Monitor indexing coverage and canonical selection.
- Monitor international targeting/hreflang errors.
- Track branded query impressions/clicks per locale domain.
- Keep redirects active permanently to preserve SEO signals.
