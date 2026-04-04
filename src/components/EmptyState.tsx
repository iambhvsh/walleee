export function EmptyState(): React.JSX.Element {
  return (
    <div id="empty-state" className="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none"
        stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p className="section-title" style={{ fontWeight: 400 }}>Uh Ohh :(</p>
      <p className="meta-text" style={{ maxWidth: 300, lineHeight: 1.5 }}>
        Something went wrong, try refreshing the page!
      </p>
    </div>
  );
}
