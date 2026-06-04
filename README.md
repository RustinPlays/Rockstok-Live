# Rockstok Covers Band Site

This is a static band site for Rockstok Covers with:

- Full landing hero
- About section
- Upcoming gigs
- Music / event style section
- Fourthwall-powered merch
- Meet the band
- Booking form using email
- Aqua / smoky / magical styling based on the Rockstok cauldron logo

## Fourthwall config

Open `config.js`.

Current setup:

```js
FOURTHWALL_STOREFRONT_TOKEN: "your storefront token",
FOURTHWALL_COLLECTION_HANDLE: "all",
FOURTHWALL_SHOP_DOMAIN: "rockstok.live",
FOURTHWALL_SHOP_BASE_URL: "https://rockstok.live/en-nzd",
DEFAULT_CURRENCY: "NZD"
```

Important: `FOURTHWALL_SHOP_DOMAIN` should be only the domain, not the full collections URL.

## Add gigs

In `config.js`, add gigs like this:

```js
gigs: [
  {
    date: "2026-09-27",
    title: "Rockstok Live",
    venue: "Paraoa Brewing Co.",
    location: "Whangaparāoa",
    time: "8:00 PM",
    ticketUrl: ""
  }
]
```

## Deploy

Upload the folder to GitHub Pages, Netlify, Vercel, or any static website host.
