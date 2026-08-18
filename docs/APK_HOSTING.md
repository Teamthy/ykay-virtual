# Hosting the NUVORA APK (direct download, no app store)

## The 25MB problem
- **Cloudflare Pages free tier** has a **25MB per-asset limit** — a 100MB+ APK
  will be rejected there.
- **Cloudflare R2 object storage** has NO such limit (up to 5TB per object).
- **GitHub Releases** also have no practical size limit (2GB), and are free.

So: serve the APK from **GitHub Releases** (simplest) or **R2**.

---

## Option A — GitHub Releases (recommended, zero setup)
1. The CI workflow `.github/workflows/apk-release.yml` builds the APK and, on a
   `v*` tag, uploads it to a GitHub Release.
2. Push a tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. The APK is available at the release's latest download URL:
   `https://github.com/Teamthy/ykay-virtual/releases/latest/download/<apk-name>.apk`
4. On Vercel/Render set:
   ```
   NEXT_PUBLIC_APK_URL=https://github.com/Teamthy/ykay-virtual/releases/latest/download/<apk-name>.apk
   ```

---

## Option B — Cloudflare R2 (no 25MB limit, private/stable)
1. In Cloudflare dashboard: **R2 → Create bucket** (e.g. `nuvora-apps`).
2. Make the bucket public (or use a custom domain) so the APK is fetchable.
3. Create an **R2 API token** (S3-compatible credentials): bucket read/write.
4. Upload with the S3-compatible CLI (via CI or locally):
   ```bash
   export AWS_ACCESS_KEY_ID=...       # R2 token access key
   export AWS_SECRET_ACCESS_KEY=...   # R2 token secret
   export AWS_ENDPOINT_URL="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
   aws s3 cp nuvora-app.apk s3://nuvora-apps/nuvora-app.apk --endpoint-url "$AWS_ENDPOINT_URL"
   ```
5. Public URL: `https://pub-<hash>.r2.dev/nuvora-app.apk` (or your custom domain).
6. On Vercel/Render set:
   ```
   NEXT_PUBLIC_APK_URL=https://pub-<hash>.r2.dev/nuvora-app.apk
   ```

> R2 public buckets support objects larger than 25MB — only Cloudflare Pages
> assets are capped at 25MB on the free plan.

---

## CI secrets to configure (for the GitHub Actions workflow)
| Secret | Purpose |
|---|---|
| `EXPO_TOKEN` | EAS build/update (required for the APK + OTA) |
| `R2_ACCESS_KEY_ID` | R2 S3 token access key (optional) |
| `R2_SECRET_ACCESS_KEY` | R2 S3 token secret (optional) |
| `R2_ACCOUNT_ID` | Cloudflare account id (optional) |
| `R2_BUCKET` | bucket name, e.g. `nuvora-apps` (optional) |

---

## OTA updates (new features, no reinstall)
```bash
cd mobile
npx eas update --channel preview --message "feat: ..."
```
Installed APKs check on launch, download, and prompt "Restart" (UpdateBanner).

---

## Native-only changes still need a new APK
Adding a new native module requires a fresh `eas build` / the release workflow.
Pure JS/TS features ship via `eas update` (no reinstall).
