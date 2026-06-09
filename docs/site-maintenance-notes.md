# Rockstok Site Maintenance Notes

These notes point to the code areas most likely to need future edits.

## Navigation

- Public page nav links live directly in each HTML file near the top inside `.nav-links`.
- `Enquiries` is its own page at `enquiries.html`; nav links should point there, not to `index.html#enquiries`.
- The phone menu is handled in `app.js` by `setupNav()`.
- The admin phone menu is handled in `admin-gigs.js` by `setupAdminMobileNav()`.
- If you add a new public page, add the same nav links and footer links so pages stay consistent.

## Top Links

- Footer `Top` links use `href="#top"`.
- `app.js` has `setupTopLinks()` so clicking Top always scrolls back to the page header.

## Social Icons

- Social icon images are in `assets/`.
- GitHub Pages is case-sensitive, so the HTML must match filenames exactly:
  - `assets/Instagram.png`
  - `assets/Facebook.png`
  - `assets/Youtube.png`

## Mobile Booking Order

- The phone layout is controlled in `styles.css` under the `@media (max-width: 980px)` block.
- The intended mobile order is:
  1. Booking heading text
  2. Booking form
  3. Contact and follow boxes

## Admin Access

- The hidden backstage shortcut is `.backstage-link` in public HTML pages.
- `styles.css` hides `.backstage-link` on phones so normal visitors do not accidentally tap into the admin page.
- Admin page controls are in `backstage.html`; admin behavior is in `admin-gigs.js`.

## Page Heading Height

- Page intro spacing is controlled by `.section-top`, `.page-section`, and `.booking-page-section` in `styles.css`.
- Lower `padding-top` values move the small eyebrow labels and page titles higher.
