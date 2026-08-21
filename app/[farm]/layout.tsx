import type { ReactNode } from "react";

/* The shopfront is the one part of Shamba that strangers see, so it carries its
   own typography rather than the app's system stack. Loaded as a stylesheet
   link so a build never has to reach the font host. */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Karla:wght@400;500;600;700&display=swap"
      />
      {children}
    </>
  );
}
