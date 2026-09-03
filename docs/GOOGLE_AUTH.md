# Google sign-in — create the app and paste the keys

The login and onboarding pages already have **Continue with Google**.
The API exchanges the code and the Next.js route
`/auth/google/callback` sets `ykv_session`.

A bug (handler never stored the Google service) is fixed in the same
commit as this doc. After you deploy that commit **and** set the three
Render env vars, the button works.

## 1. Google Cloud project

1. Open [https://console.cloud.google.com](https://console.cloud.google.com).
2. Sign in with the Google account that will own YK-Virtual.
3. Top bar → **Select a project** → **New project**.
   - Name: `YK-Virtual`
   - Create.
4. Wait until the project is selected (name shows in the top bar).

## 2. OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**.
2. If asked for **Google Auth platform** / **Branding**:
   - User type: **External**
   - App name: `YK-Virtual`
   - User support email: your Gmail
   - Developer contact: same email
3. **Save**.
4. **Scopes** → Add or remove scopes → tick:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. **Save**.
6. **Test users** (while the app is in Testing):
   - Add **every Gmail** you will use to try login (including yours).
   - Until you click **Publish app**, only those emails can sign in.

Publishing later (optional): needs a privacy policy URL
(`https://ykay-virtual-wtar.vercel.app/privacy`). Not required for your
own tests.

## 3. OAuth client ID

1. **APIs & Services** → **Credentials** → **+ Create credentials** →
   **OAuth client ID**.
2. Application type: **Web application**.
3. Name: `YK-Virtual web`.
4. **Authorized JavaScript origins** (no path, no trailing slash):

   ```
   https://ykay-virtual-wtar.vercel.app
   ```

   Later add `https://virtual.ykaycollege.com.ng` when the domain is live.

5. **Authorized redirect URIs** — must match **exactly**:

   ```
   https://ykay-virtual-wtar.vercel.app/auth/google/callback
   ```

   Later add `https://virtual.ykaycollege.com.ng/auth/google/callback`.

   Do **not** use the Render API host here. Google must send the browser
   back to **Vercel**, where the cookie is set.

6. **Create**. Copy:
   - **Client ID** → `GOOGLE_CLIENT_ID` (ends in `.apps.googleusercontent.com`)
   - **Client secret** → `GOOGLE_CLIENT_SECRET`

## 4. Paste on Render (API)

Dashboard → **ykay-virtual** → **Environment** → add:

| Key                    | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`     | the client ID                                               |
| `GOOGLE_CLIENT_SECRET` | the client secret                                           |
| `GOOGLE_REDIRECT_URL`  | `https://ykay-virtual-wtar.vercel.app/auth/google/callback` |

Same string as the Authorized redirect URI. No trailing slash, `https`.

**Save** → **Manual Deploy** → **Deploy latest commit**.

The API must be the build that includes the `google: google` handler fix.
Confirm `/health` is ok after deploy.

## 5. Try it

1. Open `https://ykay-virtual-wtar.vercel.app/login`.
2. **Continue with Google**.
3. Pick a **test user** Gmail.
4. You should land on `/onboarding/wizard` (first time) or `/dashboard`.

If you see “Google sign-in isn't enabled yet”, Render still has empty
client id/secret or the new deploy is not live.

If Google shows `redirect_uri_mismatch`, the URI in Cloud Console does
not equal `GOOGLE_REDIRECT_URL` character-for-character.

If you see `invalid or expired oauth state`, Redis is down **and** the
API process restarted between the click and the callback. Retry once;
for reliability add Upstash `REDIS_URL` (state is stored in cache).

## 6. After you buy virtual.ykaycollege.com.ng

1. Add the new origin + redirect URI in Google Cloud.
2. Change Render `GOOGLE_REDIRECT_URL` to
   `https://virtual.ykaycollege.com.ng/auth/google/callback`.
3. Change `SITE_URL` / `ALLOWED_ORIGINS` / Vercel `NEXT_PUBLIC_SITE_URL`
   to the same host.
4. Redeploy Render + Vercel.
