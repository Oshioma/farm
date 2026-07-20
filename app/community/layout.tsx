import { Manrope } from "next/font/google";

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${bodyFont.className} min-h-screen bg-zinc-50 text-zinc-900`}>{children}</div>;
}
