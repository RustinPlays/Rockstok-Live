window.ROCKSTOK_CONFIG = {
  // Fourthwall setup:
  // Storefront tokens are used by the public Storefront API, so this is used client-side.
  FOURTHWALL_STOREFRONT_TOKEN: "ptkn_2f939d2b-8c37-44bb-a542-7931b08cee41",
  FOURTHWALL_COLLECTION_HANDLE: "all",

  // Keep this as the shop domain only. Do not include /collections/all here.
  FOURTHWALL_SHOP_DOMAIN: "rockstok-shop.fourthwall.com",

  // Base URL used for product and full shop links.
  FOURTHWALL_SHOP_BASE_URL: "https://rockstok-shop.fourthwall.com/en-nzd",
  DEFAULT_CURRENCY: "NZD",

  // Optional: add a Google Maps browser API key with Maps JavaScript API and Places enabled
  // to turn the backstage map address field into Google-style address suggestions.
  GOOGLE_MAPS_BROWSER_API_KEY: "",

  // Testing address. Change this to rockstokcovers@gmail.com when ready.
  bookingEmail: "Justin.oshea135@gmail.com",

  // Add confirmed public gigs here. Example format:
  // { date: "2026-09-27", title: "Rockstok Live", venue: "Paraoa Brewing Co.", location: "Whangaparaoa", time: "8:00 PM", ticketUrl: "" }
  gigs: [],

  songTags: [
    "Dragon",
    "The Cars",
    "Green Day",
    "My Chemical Romance",
    "Hello Sailor",
    "The Cure",
    "Beastie Boys",
    "R.E.M.",
    "Pink Floyd",
    "Original Rockstok Songs",
    "Classic Covers",
    "Modern Favourites"
  ],

  band: [
    {
      name: "Sean O'Shea",
      role: "Lead Vocals, Rhythm & Acoustic Guitar",
      bio: "Frontman, riff wrangler and chief crowd-starter.",
      image: "assets/Sean.png"
    },
    {
      name: "Craig Garret",
      role: "Lead Guitar & Backing Vocals",
      bio: "Sends solos skyward and keeps the choruses stacked.",
      image: "assets/Craig.png"
    },
    {
      name: "Norman Smith",
      role: "Bass & Backing Vocals",
      bio: "Locks the groove, drives the low end and sneaks in the harmonies.",
      image: "assets/Norm.png"
    },
    {
      name: "Kuzma Rabadan",
      role: "Drums",
      bio: "Keeps the engine roaring and the dance floor honest.",
      image: "assets/Kuzma.png"
    },
    {
      name: "Justin O'Shea",
      role: "Sound and Lighting Technician",
      bio: "Runs the sound, lighting and live-show production details.",
      image: "assets/Justin.png"
    }
  ]
};
