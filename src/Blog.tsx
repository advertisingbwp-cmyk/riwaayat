import { useEffect } from 'react';
import { blogPosts, type BlogPost } from './blog-data';
import './blog.css';
import './account.css';

export default function Blog({ slug }: { slug?: string }) {
  const post = slug ? blogPosts.find(p => p.slug === slug) : null;

  useEffect(() => {
    const origTitle = document.title;
    const descMeta = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const canonical = document.querySelector('link[rel="canonical"]');

    const origDesc = descMeta?.getAttribute('content') || '';
    const origOgTitle = ogTitle?.getAttribute('content') || '';
    const origOgDesc = ogDesc?.getAttribute('content') || '';
    const origOgUrl = ogUrl?.getAttribute('content') || '';
    const origCanonical = canonical?.getAttribute('href') || '';

    let scriptEl: HTMLScriptElement | null = null;

    if (post) {
      const pageUrl = `https://riwaayat-venue.vercel.app/blog/${post.slug}`;
      document.title = `${post.title} — Riwaayat Guides`;
      descMeta?.setAttribute('content', post.excerpt);
      ogTitle?.setAttribute('content', `${post.title} — Riwaayat Guides`);
      ogDesc?.setAttribute('content', post.excerpt);
      ogUrl?.setAttribute('content', pageUrl);
      canonical?.setAttribute('href', pageUrl);

      // JSON-LD Article Schema
      scriptEl = document.createElement('script');
      scriptEl.type = 'application/ld+json';
      scriptEl.id = 'article-ld-json';
      scriptEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt,
        author: {
          '@type': 'Organization',
          name: 'Riwaayat'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Riwaayat',
          logo: {
            '@type': 'ImageObject',
            url: 'https://riwaayat-venue.vercel.app/images/royal.webp'
          }
        },
        mainEntityOfPage: pageUrl
      });
      if(!document.getElementById('page-ld-json'))document.head.appendChild(scriptEl);
    } else {
      const hubUrl = 'https://riwaayat-venue.vercel.app/blog';
      document.title = 'Wedding & Celebration Guides, Etiquette & Ideas — Riwaayat';
      descMeta?.setAttribute('content', 'Explore guides on digital wedding invitations, online RSVP management, ceremony etiquette, and Pakistani wedding traditions.');
      ogTitle?.setAttribute('content', 'Wedding & Celebration Guides — Riwaayat');
      ogDesc?.setAttribute('content', 'Explore guides on digital wedding invitations, online RSVP management, ceremony etiquette, and Pakistani wedding traditions.');
      ogUrl?.setAttribute('content', hubUrl);
      canonical?.setAttribute('href', hubUrl);
    }

    window.scrollTo(0, 0);

    return () => {
      document.title = origTitle;
      descMeta?.setAttribute('content', origDesc);
      ogTitle?.setAttribute('content', origOgTitle);
      ogDesc?.setAttribute('content', origOgDesc);
      ogUrl?.setAttribute('content', origOgUrl);
      canonical?.setAttribute('href', origCanonical);
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
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
