# My Library

`bookmanager.html` is a mobile-first, single-file bookshelf manager built with plain HTML, Tailwind CSS, and JavaScript. Users can scan a barcode or enter an ISBN manually, fetch book metadata from public APIs, record reading status and notes, attach a cover image, and back up the catalog through CSV export/import.

When Firebase configuration is available, the app syncs books to Firestore. If Firebase is not available, it automatically falls back to browser `localStorage`.

## Features

- Trilingual interface: **English**, **Japanese**, and **Simplified Chinese**
- Mobile-oriented layout with iOS safe-area padding support
- Camera-based barcode scanning using `html5-qrcode`
- Manual ISBN lookup
- Metadata lookup fallback chain:
  1. `openBD`
  2. `Google Books API`
  3. `Open Library Books API`
- Add, edit, and delete book records
- Track:
  - ISBN
  - title
  - author
  - price
  - reading status (`unread`, `reading`, `read`)
  - notes
  - cover image
  - entry date
- Upload or take a cover photo
- Client-side image compression before saving
- CSV export and import
- Optional Firebase Authentication + Firestore synchronization
- Automatic local-only mode when cloud configuration is unavailable

## How the App Works

1. The user selects a UI language.
2. The app loads saved books from Firestore if Firebase is initialized and authentication succeeds.
3. If cloud sync is not available, the app uses browser `localStorage`.
4. A book can be added by scanning a barcode or entering an ISBN manually.
5. The app queries public APIs to fill title, author, and cover information.
6. The user can then complete or edit the remaining fields and save the record.
7. Saved books are displayed as cards and sorted by `entryDate` in descending order.

## Data Model

| Field | Type | Description |
|---|---|---|
| `id` | string | Local record ID or Firestore document ID |
| `isbn` | string | ISBN / barcode value |
| `title` | string | Book title. This is the only required field in the form |
| `author` | string | Author name |
| `price` | string | Free-text price field |
| `status` | string | `unread`, `reading`, or `read` |
| `notes` | string | Reading notes |
| `coverUrl` | string | Cover image URL fetched from an external API |
| `customImage` | string | Base64-encoded uploaded photo after client-side compression |
| `entryDate` | string | ISO timestamp used for sorting |

## Tech Stack

- **HTML5**
- **Vanilla JavaScript**
- **Tailwind CSS** via CDN
- **Lucide** icons via CDN
- **html5-qrcode** for barcode scanning
- **Firebase JS SDK 11.6.1** (optional)
- Browser APIs:
  - `localStorage`
  - `fetch`
  - `FileReader`
  - `Canvas`
  - camera/media access

## Project Structure

```text
.
├── bookmanager.html
├── README.md
├── README.en.md
├── README.ja.md
└── README.zh.md
```

## Running Locally

This is a no-build client-side app. The simplest way to test it is to serve the directory locally.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/bookmanager.html
```

### Important

- Camera-based barcode scanning generally requires a **secure context** such as `http://localhost` or `https`.
- Because core libraries are loaded from CDNs, an internet connection is required unless you vendor those assets locally.

## Optional Firebase Integration

The HTML checks for these optional injected globals:

- `__firebase_config`
- `__app_id`
- `__initial_auth_token`

If valid Firebase settings are available:

- the app initializes Firebase
- signs in with a custom token when one is provided
- otherwise attempts anonymous sign-in
- listens to Firestore changes in:

```text
artifacts/{appId}/users/{uid}/books
```

### Firebase Notes

- If you do **not** provide `__initial_auth_token`, your Firebase project must allow **Anonymous Authentication**.
- Firestore security rules should match the document path above.
- If Firebase initialization fails, the app continues in local-only mode.

## External Services Used

The app uses the following public book metadata services in sequence:

1. **openBD** — first lookup target, especially useful for Japanese books
2. **Google Books API** — fallback source
3. **Open Library Books API** — second fallback source

Returned metadata depends on ISBN coverage and API availability.

## Image Handling

When a user uploads or takes a photo:

- the image is loaded in the browser
- resized to a maximum of **600 × 800** while preserving aspect ratio
- converted to **JPEG**
- compressed with quality **0.7**
- stored as a Base64 string in `customImage`

An uploaded image overrides the fetched cover image for that saved record.

## CSV Import / Export

### Exported Columns

```csv
id,isbn,title,author,price,status,notes,coverUrl,entryDate
```

### Behavior

- Export creates `my_library.csv`
- Import expects the same general column structure
- Records with a non-empty `title` are imported
- Existing or generated IDs are used as document IDs / local IDs

### Important Limitation

`customImage` is **not included** in CSV export or import. This means user-uploaded photos are **not preserved** in CSV backups.

## Notes and Limitations

- The selected language is not persisted across page reloads.
- Some alerts and log messages are still hardcoded in Chinese.
- Browser `localStorage` has size limits; many large images can exceed available storage.
- Even with compression, large images may still cause Firestore document-size or browser storage issues.
- The CSV parser is lightweight and may not handle every CSV edge case.
- Barcode scanning needs camera permission.
- Metadata lookup needs network access.

## Summary

This project is a compact, browser-only personal library manager with a strong mobile focus. Its main strengths are:

- zero-build deployment
- quick barcode-to-book workflow
- multilingual UI
- optional cloud sync with graceful local fallback

It is well suited for personal collections, small reading logs, and lightweight inventory-style use cases.
