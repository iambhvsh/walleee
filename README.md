# walleee

A minimal, fast wallpaper gallery built with React and Vite, backed by Cloudinary for image storage and deployed on Vercel.

---

## Features

- **Daily carousel** — 6 wallpapers picked each day via a seeded shuffle (consistent for all visitors, refreshes at midnight).
- **Masonry gallery** — responsive multi-column grid that adapts to screen width.
- **Lightbox** — full-screen viewer with keyboard and swipe navigation.
- **One-click download** — saves the full-resolution image directly to disk.
- **Dark / light theme** — persisted across sessions.
- **Lazy loading** — images load only as they scroll into view.
- **Automatic cache revalidation** — Cloudinary webhooks bust the API cache whenever images are uploaded, renamed, or deleted.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Hosting | Vercel (static site + serverless functions) |
| Image storage | Cloudinary |
| Styling | Plain CSS (no framework) |

---

## Project Structure

```
walleee/
├── api/
│   ├── _config.ts        # Shared env vars and helpers
│   ├── wallpapers.ts     # GET /api/wallpapers — fetches all images from Cloudinary
│   └── revalidate.ts     # POST /api/revalidate — Cloudinary webhook handler
├── src/
│   ├── components/
│   │   ├── Carousel.tsx      # Daily picks carousel
│   │   ├── Gallery.tsx       # Masonry image grid
│   │   ├── Lightbox.tsx      # Full-screen image viewer
│   │   ├── Header.tsx        # Top bar with theme toggle and info button
│   │   ├── InfoModal.tsx     # Stats / about modal
│   │   ├── LazyImage.tsx     # IntersectionObserver-based lazy loader
│   │   └── EmptyState.tsx    # Shown when no wallpapers exist
│   ├── hooks/
│   │   ├── useWallpapers.ts  # Fetches wallpapers, manages carousel/gallery split
│   │   ├── useLightbox.ts    # Lightbox open/close/navigation state
│   │   ├── useTheme.ts       # Dark/light theme toggle
│   │   └── useColumnCount.ts # Responsive column count for masonry layout
│   ├── types/index.ts        # Shared TypeScript types
│   ├── utils/download.ts     # File download helper
│   └── styles/index.css      # Global styles
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.ts
├── vercel.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Cloudinary](https://cloudinary.com/) account with images uploaded to a folder (default: `walls`)
- A [Vercel](https://vercel.com/) account (for deployment)

### Local Development

1. **Clone the repo and install dependencies:**

   ```bash
   git clone https://github.com/your-username/walleee.git
   cd walleee
   npm install
   ```

2. **Create a `.env` file** in the project root:

   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLOUDINARY_FOLDER=walls          # Optional — defaults to "walls"
   REVALIDATE_SECRET=a_random_secret
   APP_URL=http://localhost:5173     # Used only in local dev
   ```

3. **Start the dev server:**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`. API routes are handled by Vercel's local dev server — run `vercel dev` if you need them locally.

---

## Deployment

### Deploy to Vercel

1. Push the project to a GitHub repository.
2. Import the repo into Vercel. It will detect the Vite framework automatically.
3. Add the following environment variables in the Vercel project settings:

   | Variable | Description |
   |---|---|
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |
   | `CLOUDINARY_FOLDER` | Cloudinary folder containing wallpapers (default: `walls`) |
   | `REVALIDATE_SECRET` | A long random string used to authenticate cache-bust calls |

   > `VERCEL_PROJECT_PRODUCTION_URL` is injected automatically by Vercel — you do not need to set `APP_URL` in production.

4. Deploy. Vercel will build with `npm run build` and serve `dist/` as the static output.

---

## Cloudinary Setup

### Adding Wallpapers

Upload images to the folder specified by `CLOUDINARY_FOLDER` (default: `walls`). The API fetches all resources in that folder sorted by upload date (newest first).

**Optional metadata** — set a `caption` key in a resource's context to use it as the wallpaper title:

```
context: { caption: "My Wallpaper Title" }
```

### Webhook for Automatic Cache Revalidation

To keep the gallery up to date without manual redeploys, configure a Cloudinary notification webhook:

1. In Cloudinary, go to **Settings → Notifications**.
2. Add a new webhook URL:
   ```
   https://your-vercel-domain.vercel.app/api/revalidate
   ```
3. Enable the events: `upload`, `delete`, `rename`, `destroy`.

When Cloudinary fires a webhook, `/api/revalidate` verifies the HMAC-SHA256 signature and calls `/api/wallpapers` with a bypass token to refresh Vercel's edge cache.

---

## API Reference

### `GET /api/wallpapers`

Returns all wallpapers from the configured Cloudinary folder.

**Response:**
```json
{
  "wallpapers": [
    {
      "id": "walls/my-image",
      "publicId": "walls/my-image",
      "url": "https://res.cloudinary.com/.../f_auto,q_auto/walls/my-image",
      "thumbnailUrl": "https://res.cloudinary.com/.../f_auto,q_auto,w_800,c_limit/walls/my-image",
      "width": 3840,
      "height": 2160,
      "format": "jpg",
      "tags": [],
      "title": "My Image"
    }
  ],
  "total": 1
}
```

Cached for 24 hours (`s-maxage=86400`) with a 30-day stale-while-revalidate window.

### `POST /api/revalidate`

Cloudinary webhook endpoint. Verifies the `x-cld-signature` / `x-cld-timestamp` headers and busts the `/api/wallpapers` edge cache for relevant events (`upload`, `delete`, `rename`, `destroy`).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checking without emitting files |

---

## License

MIT
