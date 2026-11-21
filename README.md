# PahaadSaathi

**A simple mountain-travel safety companion for reporting hazards, checking route risks, and sharing alerts.**

PahaadSaathi is a cross-platform mobile app built with Expo and React Native. Travellers can report road and weather hazards, attach a photo and location, browse recent reports, review route risks, and share an emergency location. When mobile data is unavailable, the app can relay short safety alerts over Bluetooth to nearby PahaadSaathi devices.

> **Safety note:** PahaadSaathi is a community aid, not an emergency service or a substitute for official road, weather, or rescue information. For immediate danger in India, call 112. Bluetooth works only between nearby devices; it does not send a message directly across 25 km. Longer-distance delivery depends on other participating phones relaying the alert and is not guaranteed.

## Features

- **Hazard reports:** report landslides, road damage, waterlogging, accidents, fallen trees, or another hazard; add a description, severity, coordinates, and optional photo.
- **Hazard feed:** browse reports, see their status and severity, and open report details.
- **Offline report queue:** keep reports on the device while offline and sync queued reports when connectivity returns.
- **Bluetooth safety relay:** opt in to nearby Bluetooth Low Energy discovery and send/forward short alerts using store-and-forward queuing. Relay requires a native development or release build and Bluetooth permissions; it is not available in Expo Go or the web app.
- **Route planning and hazard awareness:** search for places, choose a car, motorcycle, or truck profile, calculate routes through a configured Valhalla service, and inspect hazards near a route.
- **Emergency assistance:** open emergency calling options and prepare the current location for sharing through SMS or WhatsApp. The user reviews and sends the message in the device’s messaging app.
- **Light and dark themes:** choose a theme using the sun/moon control; the preference is saved on the device.
- **Responsive navigation:** minimal home, report, and feed views, with animated scrolling and layouts for mobile and web.
- **Moderator dashboard:** moderator sign-in and report review/status and vehicle restrictions, gated by Supabase Auth and a `moderators` membership row.

## Screens

| Screen | What it does |
| --- | --- |
| Home | Quick access to reporting, recent hazards, emergency tools, and Bluetooth relay state |
| Map | Search locations, calculate a route, select a vehicle type, and review nearby hazard warnings |
| Hazard details | View a report and share its safety card or location |
| Emergency assistance | Call listed hotlines or open SMS/WhatsApp with a location message ready |
| Offline relay | Enable Bluetooth discovery and view relay device/queue information |
| Account / sign-in | Save a local traveller profile on this device |
| Moderator | Sign in through Supabase and review reports if the account is an authorized moderator |

## Technology

- **App:** React Native 0.88, React 19, TypeScript 6
- **Platform/build:** Expo SDK 58, Expo Router, EAS Build
- **UI and device features:** React Native SVG, Reanimated, Expo Image, Expo Location, Expo Image Picker, Expo SMS, Expo Sharing, Expo SQLite
- **Bluetooth:** `munim-bluetooth` and `react-native-nitro-modules` for native BLE central/peripheral support
- **Data and connectivity:** Supabase JavaScript client, AsyncStorage, SQLite, NetInfo
- **Routing:** Valhalla-compatible directions endpoint; Photon geocoding and curated Himalayan location data
- **Languages/platforms:** TypeScript; iOS, Android, and web (Bluetooth is native-only)

## Requirements

- Node.js 20 or newer and npm
- An iOS or Android device/emulator for native development
- For EAS builds: an Expo account; Apple Developer account/signing for App Store distribution
- A Supabase project configured with the database table, policies, and photo bucket below
- A Valhalla routing endpoint if route calculation is required

## Get started

```bash
git clone https://github.com/Sagar264offici/PahaadSaathi-MobileApp.git
cd PahaadSaathi-MobileApp
npm ci
cp .env.example .env
```

Fill the values in `.env`, then start the Expo development server:

```bash
npx expo start
```

The BLE module needs native code. Create and run a development build with the appropriate platform tooling:

```bash
npm run android
npm run ios
```

`npm run web` starts the web version. Web supports the app’s web-compatible screens, but not Bluetooth relay.

## Environment variables

Create `.env` from `.env.example` for local development. Add the same `EXPO_PUBLIC_*` values to the EAS `production` environment before cloud builds. Expo public variables are included in the client app, so use only public client credentials here. **Never put a Supabase `service_role` key in this app or in a public repository.**

| Variable | Required | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/anonymous client key; database and storage policies still control access |
| `EXPO_PUBLIC_VALHALLA_URL` | For route calculation | Base URL of a Valhalla-compatible `/route` API |

## Supabase setup

1. Create a Supabase project.
2. Create a `hazards` table with the fields used by the app: `id`, `type`, `description`, `latitude`, `longitude`, `photo_url`, `created_at`, `status`, `severity`, and `blocked_vehicles`. Use a UUID or another ID type consistently with your project. Set suitable defaults for `id`, `created_at`, `status`, and `blocked_vehicles`.
3. Enable Row Level Security and configure policies for public report creation and reading, plus moderator-only updates. The app’s publishable key is not a secret and does not bypass RLS.
4. Create moderator accounts in Supabase Auth, then add each approved user's UUID to a `moderators` table with a `user_id` column. Apply RLS so only authorized moderators can read membership and update reports.
5. In Supabase Dashboard → SQL Editor, run [`supabase/storage.sql`](supabase/storage.sql). It creates the exact `Hazard-Photos` bucket and allows image uploads under `hazards/` for anonymous/authenticated app users.

The storage script makes the bucket public so report images can be displayed by URL. Anyone who obtains a public object URL can view that image. It limits uploads to 5 MB and JPEG, PNG, or WebP. Adjust bucket visibility and policies if that does not fit your deployment.

Traveller profiles in the current account screens are stored locally on the device; they are not Supabase Auth accounts. Only the moderator flow uses Supabase Auth.

## Bluetooth relay: what to expect

The app scans and advertises a PahaadSaathi BLE service, connects to compatible nearby phones, and transfers alert messages in small chunks. Received alerts are deduplicated and can be forwarded onward while relay is active. Users must grant Bluetooth permissions and leave relay enabled. Bluetooth range is usually limited to the nearby area and varies with phones, terrain, obstacles, and radio conditions. A 25 km journey is possible only as a chain of phones that encounter one another and forward the message; the app cannot guarantee peers, background delivery, or end-to-end arrival. Bluetooth does not require people to manually pair in system settings, but devices still need to be nearby and have relay enabled.

## Release builds

Install EAS CLI and sign in:

```bash
npm install --global eas-cli
eas login
eas build:configure
```

Add the environment values in the Expo dashboard under the `production` environment (or use EAS environment commands), then build:

```bash
# Android installable APK for direct testing/sharing
eas build --profile preview --platform android

# Android store bundle (AAB)
eas build --profile production --platform android

# iOS App Store build (requires Apple signing)
eas build --profile production --platform ios

# Build both platforms
eas build --profile production --platform all
```

EAS will guide you through Android signing key creation and iOS signing setup. Store builds still need the relevant Google Play/App Store listing, review, and release steps. Keep signing credentials private and backed up.

## Repository scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start Expo development server |
| `npm run android` | Build/run the native Android app locally |
| `npm run ios` | Build/run the native iOS app locally |
| `npm run web` | Start the web version |
| `npm run lint` | Run Expo ESLint checks |
| `npx tsc --noEmit` | Check TypeScript types |

## Project structure

```text
src/app/          Expo Router screens and routes
src/components/   Shared UI components
src/context/      App theme provider
src/data/         Hazard and local profile state
src/lib/          Supabase, storage, location, routing, and BLE relay services
src/theme/        Theme definitions
assets/           App icons, images, and fonts
supabase/         Supabase setup SQL
```

## Privacy and operational notes

- Location is requested when a feature needs it, such as reporting a coordinate or sharing an emergency location.
- Emergency SMS and WhatsApp links open a compose/review flow; this app does not silently send a message.
- Hazard photos are uploaded to Supabase Storage when configured; reports can be queued locally while offline.
- Do not commit `.env`, signing files, private keys, or service-role credentials.
- Review Supabase Row Level Security and storage policies before releasing publicly. Publishable keys are safe to bundle only when the policies are correctly restricted.
- Public hazard reports and photo URLs may expose submitted location and image information. Tell users what is shared before launch and apply retention rules appropriate for your service.

## Contributing

1. Create a branch for your change.
2. Keep secrets and generated native build files out of commits.
3. Run `npx tsc --noEmit` and `npm run lint` before opening a pull request.
4. Describe device, OS version, and steps to reproduce for Bluetooth or location issues.

## License

See [`LICENSE`](LICENSE).
