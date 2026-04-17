import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Farm App</h1>
      <p>
        Farm App helps small farms plan, track, and improve daily operations in
        one place.
      </p>
      <p>Use it to:</p>
      <ul>
        <li>Organize crops, trees, zones, and farm systems</li>
        <li>Track tasks, work hours, and harvest activity</li>
        <li>Monitor soil, compost, and seedling progress over time</li>
      </ul>
      <p>
        <Link href="/farm">Open Farm Manager</Link>
      </p>
    </main>
  );
}
