import { useEffect } from 'react';
import { blogPosts, type BlogPost } from './blog-data';
import './blog.css';
import './account.css';

export default function Blog({ slug }: { slug?: string }) {
  const post = slug ? blogPosts.find(p => p.slug === slug) : null;

  useEffect(() => {
    if (post) {
      document.title = `${post.title} — Riwaayat Guides`;
    } else {
      document.title = 'Wedding & Celebration Guides — Riwaayat';
    }
    window.scrollTo(0, 0);
  }, [post]);

  if (slug && !post) {
    return (
      <div className="account-page">
        <main>
          <a href="/blog">← Back to guides</a>
          <h1>Article not found</h1>
          <p>The guide you were looking for does not exist or has been moved.</p>
          <a className="button primary" href="/blog">Explore all guides</a>
        </main>
      </div>
    );
  }

  if (post) {
    return (
      <div className="blog-page">
        <header className="site-header">
          <div className="nav-shell">
            <a className="brand" href="/">❋ riwaayat</a>
            <nav id="main-nav" aria-label="Main navigation">
              <a href="/#designs">The collection</a>
              <a href="/blog">Guides</a>
              <button className="nav-cta" onClick={() => location.assign('/account')}>
                Create an invitation <span aria-hidden="true">↗</span>
              </button>
            </nav>
          </div>
        </header>

        <article className="blog-article">
          <a className="blog-back-link" href="/blog">
            ← Back to all guides
          </a>

          <header className="blog-article-header">
            <div className="blog-card-meta">
              <span>{post.category}</span> · <span>{post.date}</span> · <span>{post.readTime}</span>
            </div>
            <h1>{post.title}</h1>
          </header>

          <p className="blog-intro">{post.content.intro}</p>

          <div className="blog-body">
            {post.content.sections.map((section, idx) => (
              <section key={idx}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}

                {section.bulletPoints && (
                  <ul>
                    {section.bulletPoints.map((item, bIdx) => (
                      <li key={bIdx}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.highlightBox && (
                  <div className="blog-highlight">
                    <strong>Note:</strong> {section.highlightBox}
                  </div>
                )}

                {section.table && (
                  <div className="blog-table-container">
                    <table className="blog-table">
                      <thead>
                        <tr>
                          {section.table.headers.map((h, hIdx) => (
                            <th key={hIdx}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            <p className="blog-intro" style={{ marginTop: '36px' }}>{post.content.conclusion}</p>
          </div>

          <div className="blog-cta">
            <h3>Ready to craft your celebration?</h3>
            <p>Explore our curated invitation suites with interactive wax-seal envelopes, music, photo galleries, and guest RSVP.</p>
            <a className="button primary" href="/#designs">
              Explore the collection ↗
            </a>
          </div>
        </article>

        <footer>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Riwaayat Venue · Guides</span>
            <div>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="/contact">Contact</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="blog-page">
      <header className="site-header">
        <div className="nav-shell">
          <a className="brand" href="/">❋ riwaayat</a>
          <nav id="main-nav" aria-label="Main navigation">
            <a href="/#designs">The collection</a>
            <a href="/blog" style={{ fontWeight: 600 }}>Guides</a>
            <button className="nav-cta" onClick={() => location.assign('/account')}>
              Create an invitation <span aria-hidden="true">↗</span>
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="blog-hero">
          <span className="eyebrow">CELEBRATION JOURNAL</span>
          <h1>Guides, Etiquette & Ideas</h1>
          <p>Thoughtful advice on digital invitations, guest RSVP tracking, and making your celebration unforgettable.</p>
        </section>

        <section className="blog-grid">
          {blogPosts.map(item => (
            <a key={item.slug} className="blog-card" href={`/blog/${item.slug}`}>
              <div>
                <div className="blog-card-meta">
                  <span>{item.category}</span> · <span>{item.readTime}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.excerpt}</p>
              </div>
              <span className="blog-read-more">Read guide →</span>
            </a>
          ))}
        </section>
      </main>

      <footer>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Riwaayat Venue</span>
          <div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
