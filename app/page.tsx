import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Farm App</h1>
      <p>
        <Link href="/farm">Open Farm Manager</Link>
      </p>
    </main>
  );
}
