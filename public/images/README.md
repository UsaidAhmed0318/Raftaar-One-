# Images

`logo.png` is the Raftaar One logo. Profile, partner and product photos are uploaded by users and admins into Supabase Storage (see `supabase/migration-002-images.sql`), not into this folder.

The app icon is in `app/icon.svg`. Social share artwork is rendered by `app/opengraph-image.tsx`. The interface uses React Icons and CSS decoration.

Do not publish CNIC or driver licence documents in this public folder or in a public bucket.
