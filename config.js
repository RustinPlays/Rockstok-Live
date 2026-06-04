window.ROCKSTOK_CONFIG = {
  // Fourthwall setup:
  // Storefront tokens are used by the public Storefront API, so this is used client-side.
  FOURTHWALL_STOREFRONT_TOKEN: "ptkn_2f939d2b-8c37-44bb-a542-7931b08cee41",
  FOURTHWALL_COLLECTION_HANDLE: "all",

  // Keep this as the shop domain only. Do not include /collections/all here.
  FOURTHWALL_SHOP_DOMAIN: "rockstok.live",

  // Base URL used for product and full shop links.
  FOURTHWALL_SHOP_BASE_URL: "https://rockstok.live/en-nzd",
  DEFAULT_CURRENCY: "NZD",

  bookingEmail: "rockstokcovers@gmail.com",

  // Add confirmed public gigs here. Example format:
  // { date: "2026-09-27", title: "Rockstok Live", venue: "Paraoa Brewing Co.", location: "Whangaparāoa", time: "8:00 PM", ticketUrl: "" }
  gigs: [],

  songTags: [
    "Classic Rock",
    "Pub Favourites",
    "Party Anthems",
    "Singalongs",
    "80s / 90s Energy",
    "Guitar-Driven Covers",
    "Crowd Pleasers",
    "Feel-Good Nights"
  ],

  band: [
    {
      name: "Sean O'Shea",
      role: "Guitar",
      bio: "Brings stage energy, sharp riffs and big singalong vibes to the Rockstok set.",
      image: "assets/sean-oshea.png"
    },
    {
      name: "Craig Garret",
      role: "Guitar",
      bio: "A smooth mix of classic rock feel and melodic hooks that helps drive the band’s live sound.",
      image: "assets/craig-garret.png"
    },
    {
      name: "Norman Smith",
      role: "Bass",
      bio: "Holding down the low end and the groove with a laid-back presence and solid rock backbone.",
      image: "assets/norman-smith.png"
    },
    {
      name: "Kuzma Rabadan",
      role: "Drums",
      bio: "Keeping the pulse moving and the room alive with punchy rhythms and feel-good energy.",
      image: "assets/kuzma-rabadan.png"
    }
  ]
};
