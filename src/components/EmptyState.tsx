interface EmptyStateProps {
  visible: boolean;
}

export function EmptyState({ visible }: EmptyStateProps): React.JSX.Element | null {
  if (!visible) return null;

  return (
    <div id="empty-state" className="empty-state" style={{ display: 'flex' }}>
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p className="section-title" style={{ fontWeight: 400 }}>No wallpapers found</p>
      <p className="meta-text" style={{ maxWidth: 300, lineHeight: 1.5 }}>
        Upload images to your Cloudinary folder and make sure{' '}
        <code>CLOUDINARY_FOLDER</code> is set correctly in your environment.
      </p>
    </div>
  );
}
