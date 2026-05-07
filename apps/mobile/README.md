# Forti mobile

Expo client for the Forti mobile foundation. This workspace is intentionally pre-restyle: it validates native auth, protected routing, bearer-token API access, shared contracts, and CI checks before product UI work begins.

## Current scope

- Native Google sign-in via `expo-auth-session`
- Secure token storage and refresh-aware session lifecycle
- Protected Expo Router shell with placeholder tabs for home, plans, check-ins, and account
- Typed mobile API client using bearer auth against the existing Forti web API
- Shared profile/settings contracts consumed by both web routes and mobile clients

## Local setup

1. Install dependencies from the repo root:

```bash
npm install
```

2. Copy the example env file and provide Forti API + Google OAuth values:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

3. Start the mobile app from the repo root:

```bash
npm run dev:mobile
```

## Required configuration

- `EXPO_PUBLIC_API_BASE_URL`
  - Local device or Expo Go: use your machine's LAN URL, for example `http://192.168.1.10:3000`
  - Shared tunnel: use the tunnel URL exposed by Expo
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

The backend must also have the mobile auth server env configured, especially `MOBILE_JWT_SECRET` and `GOOGLE_MOBILE_CLIENT_IDS`.

## Verification

Run the mobile workspace checks from the repo root:

```bash
npm run test:mobile
npm run check:mobile
```
