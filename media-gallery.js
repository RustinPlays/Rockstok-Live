import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);
const galleryTargets = [...document.querySelectorAll("[data-media-gallery]")];

if (galleryTargets.length) {
  onSnapshot(
    query(collection(db, "galleryMedia"), where("public", "==", true)),
    (snapshot) => {
      const items = snapshot.docs
        .map((mediaDoc) => ({ id: mediaDoc.id, ...mediaDoc.data() }))
        .sort((a, b) => getTimestamp(b) - getTimestamp(a));

      galleryTargets.forEach((target) => {
        renderGallery(target, items.filter((item) => item.gallery === target.dataset.mediaGallery));
      });
    },
    (error) => {
      console.error("Could not load Rockstok gallery media.", error);
      galleryTargets.forEach((target) => renderGalleryError(target));
    }
  );
}

function renderGallery(target, items) {
  if (!items.length) {
    target.innerHTML = `
      <article class="media-gallery-empty glass-panel">
        <h3>Photos coming soon</h3>
        <p>Fresh Rockstok show moments will appear here after the next upload.</p>
      </article>
    `;
    return;
  }

  target.innerHTML = items.map((item) => {
    const title = escapeHtml(item.title || "Rockstok live");
    const caption = item.caption ? `<p>${escapeHtml(item.caption)}</p>` : "";
    const media = item.type === "video"
      ? `<video controls preload="metadata" playsinline aria-label="${title}"><source src="${escapeHtml(item.url || "")}" type="${escapeHtml(item.contentType || "video/mp4")}"></video>`
      : `<img src="${escapeHtml(item.url || "")}" alt="${title}" loading="lazy" />`;

    return `
      <article class="media-gallery-item glass-panel">
        <div class="media-gallery-frame">${media}</div>
        <div class="media-gallery-copy">
          <h3>${title}</h3>
          ${caption}
        </div>
      </article>
    `;
  }).join("");
}

function renderGalleryError(target) {
  target.innerHTML = `
    <article class="media-gallery-empty glass-panel">
      <h3>Gallery unavailable</h3>
      <p>The latest media could not be loaded. Please check back soon.</p>
    </article>
  `;
}

function getTimestamp(item) {
  return item.createdAt?.toMillis?.() || item.updatedAt?.toMillis?.() || 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
