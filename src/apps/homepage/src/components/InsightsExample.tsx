// exclusive-bem-block: insights-example
type InsightsExampleProps = {
  cards: ReadonlyArray<{ header: string; description: string }>;
};

// Kept local to the homepage; the habit renderer's implementation stays in its package.
export default function InsightsExample({ cards }: InsightsExampleProps) {
  return (
    <div className="insights-example">
      {cards.map(({ header, description }) => (
        <div key={header} className="insights-example__card">
          <span className="text-light text-b-s">{header}</span>
          <span className="text-b-s">{description}</span>
        </div>
      ))}
    </div>
  );
}
