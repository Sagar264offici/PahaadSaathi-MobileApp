import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML layout for web exports.
 * Provides critical SEO, Open Graph tags, canonical links, and accessibility landmarks.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>PahaadSaathi - Mountain Emergency & Disaster Response</title>

        {/* SEO Meta Tags */}
        <meta
          name="description"
          content="PahaadSaathi is an offline-first disaster response and mountain emergency companion for Uttarakhand, providing 1-touch SOS, road hazard telemetry, and community aid."
        />
        <link rel="canonical" href="https://pahaadsaathi-app.vercel.app/" />

        {/* Open Graph Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PahaadSaathi" />
        <meta property="og:url" content="https://pahaadsaathi-app.vercel.app/" />
        <meta property="og:title" content="PahaadSaathi - Mountain Emergency & Disaster Response" />
        <meta
          property="og:description"
          content="Offline-first disaster response, mountain road hazard tracking, and community emergency dispatch for Uttarakhand."
        />
        <meta
          property="og:image"
          content="https://pahaadsaathi-app.vercel.app/assets/images/logo.6aa20b38fa288fa70c4d23216bff7c0c.png"
        />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="PahaadSaathi - Mountain Emergency & Disaster Response" />
        <meta
          name="twitter:description"
          content="Offline-first disaster response, mountain road hazard tracking, and community emergency dispatch for Uttarakhand."
        />
        <meta
          name="twitter:image"
          content="https://pahaadsaathi-app.vercel.app/assets/images/logo.6aa20b38fa288fa70c4d23216bff7c0c.png"
        />

        {/* Expo Reset Styles */}
        <ScrollViewStyleReset />
      </head>
      <body>
        <main id="root" role="main">
          {children}
        </main>
      </body>
    </html>
  );
}
