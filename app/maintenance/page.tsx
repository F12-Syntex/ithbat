export default function MaintenancePage() {
  return (
    <html lang="en">
      <head>
        <title>Ithbat - Under Maintenance</title>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

              * { margin: 0; padding: 0; box-sizing: border-box; }

              body {
                min-height: 100dvh;
                display: flex;
                flex-direction: column;
                font-family: 'Inter', -apple-system, sans-serif;
                background: #09090b;
                color: #fafafa;
                -webkit-font-smoothing: antialiased;
              }

              .page {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2rem 1.5rem;
                position: relative;
              }

              .bg {
                position: fixed;
                inset: 0;
                background:
                  radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.045), transparent 70%),
                  radial-gradient(ellipse 60% 50% at 40% 65%, rgba(59,130,246,0.025), transparent 70%);
              }

              .content {
                position: relative;
                z-index: 1;
                width: 100%;
                max-width: 400px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }

              .badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 14px;
                border-radius: 100px;
                background: rgba(245,158,11,0.08);
                border: 1px solid rgba(245,158,11,0.12);
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.68rem;
                font-weight: 500;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                color: #f59e0b;
                margin-bottom: 2.5rem;
              }

              .badge-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: #f59e0b;
              }

              .shield {
                width: 64px;
                height: 64px;
                border-radius: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 2rem;
              }

              .shield svg {
                width: 28px;
                height: 28px;
                color: #71717a;
              }

              h1 {
                font-size: 1.75rem;
                font-weight: 800;
                letter-spacing: -0.035em;
                text-align: center;
                line-height: 1.2;
                margin-bottom: 0.75rem;
              }

              .desc {
                font-size: 0.95rem;
                color: #52525b;
                text-align: center;
                line-height: 1.6;
                margin-bottom: 2.5rem;
              }

              .card {
                width: 100%;
                border-radius: 14px;
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.05);
                overflow: hidden;
              }

              .card-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.25rem;
              }

              .card-row + .card-row {
                border-top: 1px solid rgba(255,255,255,0.04);
              }

              .card-label {
                font-size: 0.8rem;
                color: #3f3f46;
                font-weight: 500;
              }

              .card-value {
                font-size: 0.8rem;
                color: #a1a1aa;
                font-weight: 500;
                text-align: right;
              }

              .card-value.amber {
                color: #f59e0b;
              }

              .footer {
                position: relative;
                z-index: 1;
                padding: 1.25rem 1.5rem;
                display: flex;
                justify-content: center;
              }

              .footer span {
                font-family: 'JetBrains Mono', monospace;
                font-size: 0.6rem;
                letter-spacing: 0.08em;
                color: #1c1c1e;
              }

              @media (min-width: 640px) {
                h1 { font-size: 2.25rem; }
                .shield { width: 72px; height: 72px; border-radius: 18px; }
                .shield svg { width: 32px; height: 32px; }
                .content { max-width: 440px; }
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="page">
          <div className="bg" />
          <div className="content">
            <div className="badge">
              <span className="badge-dot" />
              Maintenance
            </div>

            <div className="shield">
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <h1>We&apos;ll Be Right Back</h1>
            <p className="desc">
              Ithbat is getting an upgrade.
              <br />
              Back soon, insha&apos;Allah.
            </p>

            <div className="card">
              <div className="card-row">
                <span className="card-label">Status</span>
                <span className="card-value amber">Under maintenance</span>
              </div>
              <div className="card-row">
                <span className="card-label">Services</span>
                <span className="card-value">Temporarily offline</span>
              </div>
              <div className="card-row">
                <span className="card-label">ETA</span>
                <span className="card-value">Soon</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <span>ITHBAT</span>
        </div>
      </body>
    </html>
  );
}
