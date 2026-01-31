import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Web App" />
        <meta property="og:title" content="Web App" />
        <meta property="og:description" content="Web App" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Web App" />
        <meta name="twitter:description" content="Web App" />
        <meta name="twitter:image" content="/og.png" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
