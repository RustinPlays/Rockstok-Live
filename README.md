# Rockstok Website Notes

This is a static website for Rockstok. It can be opened directly from `index.html` or uploaded to any static host.

## What Each File Does

- `index.html`: main page layout and public page copy.
- `about.html`: standalone About tab.
- `gigs.html`: standalone Gigs tab.
- `music.html`: standalone Music tab.
- `merch.html`: standalone Merch tab.
- `band.html`: standalone Band tab.
- `booking.html`: dedicated booking page linked from the main navigation.
- `styles.css`: colours, spacing, typography and responsive layout.
- `config.js`: fallback/default site data for gigs, plus setlist tags, band members, shop settings and booking email.
- `app.js`: renders gigs, band members, merch cards, mobile menu and booking email behaviour.
- `assets/`: logo and band photos used by the website.

The main page still includes the full site content for now. The top navigation opens the standalone tab pages.

## Update Band Members

Edit the `band` array in `config.js`.

Each member needs:

```js
{
  name: "Sean O'Shea",
  role: "Lead Vocals, Rhythm & Acoustic Guitar",
  bio: "Frontman, riff wrangler and chief crowd-starter.",
  image: "assets/Sean.png"
}
```

Keep the image path exactly matched to the filename in `assets/`.

## Add Public Gigs

Use the hidden admin page to create, edit, or delete events. The admin form asks for confirmation, then saves the event list into the browser event store. Public gig sections read that saved list first.

If no browser-saved event list exists yet, the website falls back to the `gigs` array in `config.js`.

Example:

```js
gigs: [
  {
    date: "2026-09-27",
    title: "Rockstok Live",
    venue: "Paraoa Brewing Co.",
    location: "Whangaparaoa",
    time: "8:00 PM",
    ticketUrl: ""
  }
]
```

Use the date format `YYYY-MM-DD`. Leave `ticketUrl` empty if there is no ticket link.

Public gig listings automatically hide events one day after the event date. Expired gigs remain visible in the admin page under Expired Events.

Because this is a static website, browser admin saves do not physically rewrite `config.js` on disk and do not publish new gigs to every visitor's browser. For all-visitor admin editing, the site needs a small backend, hosted database, or admin/form service.

## Booking Form

The booking form appears in two places:

- `index.html`, at the bottom of the main page.
- `booking.html`, as the dedicated booking page.

Both forms use the same JavaScript in `app.js`. The destination email is controlled by `bookingEmail` in `config.js`.

Current testing address:

```js
bookingEmail: "Justin.oshea135@gmail.com"
```

Change it to `rockstokcovers@gmail.com` when testing is finished.

This is a static website, so the booking form opens the visitor's email app with the enquiry already filled out. To send enquiries silently in the background, the site would need a form service or a small backend.

## Update Setlist Tags

Edit `songTags` in `config.js`. These appear as the small bubbles in the Set Style section.

## Update Images

Current expected image files:

- `assets/logo.png`
- `assets/Logo.jpg`
- `assets/Sean.png`
- `assets/Craig.png`
- `assets/Norm.png`
- `assets/Kuzma.png`

If filenames change, update the references in `index.html`, `config.js`, and `app.js`.

## Merch Settings

Fourthwall settings are in `config.js`:

```js
FOURTHWALL_STOREFRONT_TOKEN: "your storefront token",
FOURTHWALL_COLLECTION_HANDLE: "all",
FOURTHWALL_SHOP_DOMAIN: "rockstok.live",
FOURTHWALL_SHOP_BASE_URL: "https://rockstok.live/en-nzd",
DEFAULT_CURRENCY: "NZD"
```

Keep `FOURTHWALL_SHOP_DOMAIN` as only the domain.

## Public Copy Rule

Do not put setup instructions, token messages, or `config.js` references in text that appears on the live website. Put maintenance notes here instead.
