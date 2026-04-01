export const metadata = {
  title: "Farm Manager",
  description: "Inguka farm task manager and crop tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
