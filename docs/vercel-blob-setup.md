# Vercel Blob setup for Library uploads

This project supports uploading `DOCUMENT`, `IMAGE`, and `VIDEO` assets to Vercel Blob via `POST /api/library/upload`.

## What this code already does

- Uploads files from the Library modal to Vercel Blob.
- Creates a `LibraryAsset` row with the Blob URL.
- Deletes managed Vercel Blob files when the matching library asset is deleted.
- Keeps link-only uploads (`LINK`) on the existing `/api/library` endpoint.
- Supports separate token names for public and private blob stores.

## Token names this code supports

The upload/delete logic accepts these environment variables:

- Public scope (used by current Library uploads):
  - `BLOB_PUBLIC_READ_WRITE_TOKEN` (preferred)
  - fallback: `BLOB_READ_WRITE_TOKEN`
- Private scope (reserved for future private-delivery flows):
  - `BLOB_PRIVATE_READ_WRITE_TOKEN` (optional)
  - fallback: `BLOB_READ_WRITE_TOKEN`

## What you still need to do manually

1. **Create Blob storage in Vercel**
   - Create at least one Blob store.
   - If you want separate stores in the same environment, use unique custom prefixes (for example `BLOB_PUBLIC` and `BLOB_PRIVATE`).

2. **Connect storage to this project**
   - Attach the store(s) to the Forti project.
   - Confirm token environment variables are present.

3. **Set local environment variables**
   - Pull from Vercel or define manually:
     - `BLOB_PUBLIC_READ_WRITE_TOKEN=...` (optional but recommended)
     - `BLOB_PRIVATE_READ_WRITE_TOKEN=...` (optional but recommended)
     - `BLOB_READ_WRITE_TOKEN=...` (legacy single-store fallback)

4. **Redeploy after adding env vars**
   - Runtime routes require a deployment to pick up new variables.

5. **(Recommended) verify in production**
   - Upload one document, image, and video from `/library`.
   - Confirm each opens from the card.
   - Delete each and confirm blob files are removed.

## Current behavior and security

- Uploads currently use `access: 'public'` to keep file links directly accessible from Library cards.
- Current Library uploads use the public-scope token so assets can be opened directly from Library cards.
- **Tradeoff note:** this direct-public-URL approach favors speed and simplicity over strict access control, and may be changed later to a private/signed delivery model.
- Private-scope token support remains available for future private-delivery routes.
- For sensitive progress photos, use a dedicated private delivery flow (private blobs + auth-gated read route).

## Limits and file types

- Maximum upload size: **50MB**
- Allowed file types:
  - Document: PDF, DOC, DOCX, TXT
  - Image: JPEG, PNG, WEBP, GIF
  - Video: MP4, MOV, WEBM
