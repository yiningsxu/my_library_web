# BookScanDB

A mobile-first, single-file bookshelf manager built from `bookmanager.html`.

URL：https://yiningsxu.github.io/my_library_web/bookmanager.html

- English: [README.en.md](README.en.md)
- 日本語: [README.ja.md](README.ja.md)
- 中文: [README.zh.md](README.zh.md)

## Overview

This repository contains a lightweight web app for managing a personal book collection. It supports barcode scanning, ISBN-based metadata lookup, reading status tracking, notes, cover image upload, CSV import/export, and optional Firebase synchronization.

## Quick Summary

- **UI languages**: English, Japanese, Simplified Chinese
- **Book input**: camera barcode scan or manual ISBN search
- **Metadata sources**: openBD, Google Books, Open Library
- **Storage**: Firestore when configured, otherwise browser `localStorage`
- **Media**: cover image upload with client-side compression
- **Backup**: CSV export and import

## Files

- `bookmanager.html` — the complete application in a single HTML file
- `README.en.md` — detailed English documentation
- `README.ja.md` — 詳細な日本語ドキュメント
- `README.zh.md` — 详细中文文档

## Notes

This project is designed as a no-build client-side app. Most functionality is implemented directly in the browser with CDN-based dependencies.
