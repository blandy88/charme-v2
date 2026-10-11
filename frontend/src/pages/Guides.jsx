const GUIDES = [
  {
    title: "Find your family",
    body: "Start from what you already love. Fresh citrus for daytime, woods and ambers for evening, florals for spring. One family at a time — your nose learns faster that way.",
  },
  {
    title: "Test properly",
    body: "Spray on skin, never on paper alone. Wait 30 minutes: the opening lies, the dry-down tells the truth. Two fragrances per visit, maximum.",
  },
  {
    title: "Less is more",
    body: "Two sprays for the office, four for the evening. Niche concentrations project further than designer ones — let people lean in.",
  },
  {
    title: "Store it right",
    body: "Dark, cool, dry. Never the bathroom. A well-kept bottle lasts years; heat and light kill top notes in months.",
  },
];

export default function Guides() {
  return (
    <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
      <p className="meta">Advice</p>
      <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">Guides</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {GUIDES.map((g) => (
          <article key={g.title} className="rounded-sm border border-hairline bg-surface p-5">
            <h2 className="font-display text-lg text-cream">{g.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{g.body}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
