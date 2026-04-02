interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InfoModal({ isOpen, onClose }: InfoModalProps): React.JSX.Element {
  return (
    <div
      id="info-overlay"
      className={`info-overlay${isOpen ? ' visible' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal={isOpen}
      aria-label="About Walleee"
    >
      <div className="info-dialog">
        <div className="modal-head">
          <h3 className="section-title" style={{ fontSize: '1.4rem' }}>About Walleee</h3>
          <button
            className="icon-btn"
            style={{ width: 'auto', height: 'auto' }}
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </button>
        </div>

        <p className="modal-text">
          Walleee is a curated wallpaper application featuring a collection of visuals created by
          artists and designers from around the world. All wallpapers available within the app
          remain the intellectual property of their respective creators and rights holders.
        </p>

        <p className="modal-text">
          This application is designed to present high-quality visuals in a minimal and refined
          interface, with a focus on accessibility and aesthetic experience. The collection exists
          to showcase creative work and to acknowledge the individuals behind it.
        </p>

        <p className="modal-text">
          For any inquiries or communication regarding content, please contact:{' '}
          <a href="mailto:iambhvshh@outlook.com" className="modal-link">
            hello@walleee.app
          </a>
        </p>
      </div>
    </div>
  );
}
