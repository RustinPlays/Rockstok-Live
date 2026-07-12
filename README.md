# Rockstok Website Notes

This is a static website for Rockstok. It can be opened directly from `index.html` or uploaded to any static host.

## What Each File Does

- `index.html`: main page layout and public page copy.
- `about.html`: About tab, including Services and Music sections.
- `gigs.html`: standalone Gigs tab.
- `merch.html`: standalone Merch tab.
- `band.html`: standalone Band tab.
- `booking.html`: dedicated query / booking page linked from the main navigation.
- `styles.css`: colors, spacing, typography and responsive layout.
- `config.js`: editable site data for fallback gigs, setlist tags, band members and shop settings.
- `app.js`: renders fallback gigs, band members, merch cards, mobile menu and query / booking form behavior.
- `firebase-config.js`: Firebase project settings used by the live event loader and admin page.
- `gigs-live.js`: loads public events from Firebase onto `index.html` and `gigs.html`.
- `admin-gigs.js`: handles private admin login, event creation, editing, visibility changes and deletion.
- `assets/`: logo and band photos used by the website.

The main page still includes the full site content for now. Music and Services live under About instead of separate top-level nav pages.

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

## Add Public Events

Use `backstage.html` to add events through Firebase. Public events automatically appear in both places:

- `index.html`, in the home page Upcoming Gigs section.
- `gigs.html`, in the standalone Gigs page.

Events are saved in the Firestore `gigs` collection. Public events are shown only when `public` is `true` and the event date has not expired. Hidden events stay visible in admin only.

`config.js` still has a `gigs` array as a static fallback if Firebase is unavailable or if the site is run without the live loader.

Example:

```js
gigs: [
  {
    date: "2026-09-27",
    title: "Rockstok Live",
    venue: "Paraoa Brewing Co.",
    location: "Whangaparaoa",
    mapAddress: "Paraoa Brewing Co., Whangaparaoa",
    time: "8:00 PM",
    ticketUrl: ""
  }
]
```

Use the date format `YYYY-MM-DD`. Leave `ticketUrl` or `ticketLink` empty if there is no ticket link.
Use `mapAddress` for the Google Maps pin address. If it is blank, the site uses the venue and location as the map search.

Public gig listings automatically hide events one day after the event date. Expired public events are automatically deleted after they have been expired for 30 days when the admin page loads. Hidden events remain in Firebase until they are deleted in admin.

The admin page is split into Make Event and Event List sections. Use Event List to switch between all, live, hidden and expired events. Public events automatically move into expired when their date has passed. The expired section includes a Remove All button for clearing old events sooner.

## Query / Booking Form

The combined query / booking form appears in two places:

- `index.html`, at `#query-booking`.
- `booking.html`, as the dedicated booking page.

The first select chooses whether the message is a booking or a query / enquiry. `app.js` then shows the matching fields, updates the submit button, and disables hidden fields so only the relevant answers are sent.

Both forms submit through Formspree using the same endpoint:

Current query / booking Formspree endpoint:

```html
https://formspree.io/f/maqzqaob
```

## Google Maps Autocomplete

The backstage event form can show Google-style location suggestions for the `Google Maps pin address` field.

Add a browser API key in `config.js`:

```js
GOOGLE_MAPS_BROWSER_API_KEY: "your-browser-key"
```

The key needs the Maps JavaScript API and Places API enabled in Google Cloud. Restrict it to the website domain before publishing.

If the key is blank, the field still works as a normal text field and public events still create Google Maps links from the saved address.

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
- `assets/Justin.png`
- `assets/Instagram.png`
- `assets/Facebook.png`
- `assets/Youtube.png`

If filenames change, update the references in the relevant HTML files, `config.js`, and `app.js`.

## Merch Settings

Fourthwall settings are in `config.js`:

```js
FOURTHWALL_STOREFRONT_TOKEN: "your storefront token",
FOURTHWALL_COLLECTION_HANDLE: "all",
FOURTHWALL_SHOP_DOMAIN: "rockstok-shop.fourthwall.com",
FOURTHWALL_SHOP_BASE_URL: "https://rockstok-shop.fourthwall.com/en-nzd",
DEFAULT_CURRENCY: "NZD"
```

Keep `FOURTHWALL_SHOP_DOMAIN` as only the domain.

## Public Copy Rule

Do not put setup instructions, token messages, or `config.js` references in text that appears on the live website. Put maintenance notes here instead.
