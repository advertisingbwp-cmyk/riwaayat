import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { ScrollHero } from './ScrollHero';

import { designs, invitationEvents } from './events';
import { Invitation, MissingInvitation } from './Invitation';

const Responses = lazy(() => import('./Responses'));
const DataControls = lazy(() => import('./DataControls'));
const Legal = lazy(() => import('./Legal'));
const Contact = lazy(() => import('./Contact'));
const Editor = lazy(() => import('./Editor'));
const SavedInvitation = lazy(() => import('./SavedInvitation'));
const Account = lazy(() => import('./Account'));

function Brand() { return <a className="brand" href="#home" aria-label="Riwaayat Venue home"><span className="brand-flower" aria-hidden="true">❋</span><span>riwaayat<small>V E N U E</small></span></a>; }

function App() {
  const [menu, setMenu] = useState(false);
  const [filter, setFilter] = useState('All celebrations');
  const [modal, setModal] = useState<'start' | 'privacy' | 'terms' | 'contact' | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (modal) { returnFocus.current = document.activeElement as HTMLElement; dialog.current?.showModal(); document.body.style.overflow = 'hidden'; }
    else { dialog.current?.close(); document.body.style.overflow = ''; returnFocus.current?.focus(); }
    return () => { document.body.style.overflow = ''; };
  }, [modal]);
  const filtered = designs.filter(d => filter === 'All celebrations' || d.category === filter);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="nav-shell"><Brand/><button className="menu-toggle" aria-expanded={menu} aria-controls="main-nav" onClick={() => setMenu(!menu)}>{menu ? 'Close ×' : 'Menu ☰'}</button><nav id="main-nav" aria-label="Main navigation" className={menu ? 'nav-open' : ''}>
      <a href="#designs" onClick={() => setMenu(false)}>The collection</a><a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a><a href="#experience" onClick={() => setMenu(false)}>The little details</a><button className="nav-cta" onClick={() => { setMenu(false); location.assign('/account'); }}>Create an invitation <span aria-hidden="true">↗</span></button>
    </nav></div></header>
    <main id="main"><ScrollHero designs={designs} onPreview={() => location.assign('/preview/royal')}/>
    <div className="occasion-strip"><span>LOVE, IN EVERY LITTLE DETAIL</span><i>✧</i><span>WEDDINGS</span><i>✧</i><span>NIKAHS</span><i>✧</i><span>BIRTHDAYS</span><i>✧</i><span>MEMORIES IN THE MAKING</span></div>
    <section className="collection wrap section-space" id="designs"><div className="section-heading"><div><div className="eyebrow">THE FIRST COLLECTION</div><h2>Different stories.<br/><em>The same feeling of magic.</em></h2></div><p>Find the design that feels like your celebration.<br/>Three directions. Countless possibilities.</p></div>
      <div className="filters" aria-label="Filter designs">{['All celebrations', ...designs.map(d => d.category)].map(item => <button key={item} aria-pressed={filter === item} className={filter === item ? 'selected' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <p className="sr-only" aria-live="polite">{filtered.length} designs shown</p>
      <div className="design-grid">{filtered.map((d, i) => <article className={`design-card ${d.id}`} key={d.id}><button className="design-art" onClick={() => location.assign(`/preview/${d.id}`)} aria-label={`Preview ${d.name}`}><img src={d.image} alt={d.category === 'Birthday celebration' ? 'Lavender birthday cake and pastel celebration decorations' : `${d.category} celebration portrait`} loading="lazy" width="640" height="800"/><span className="design-tag">{d.category}</span><div className="sample-card"><span className="sample-ornament" aria-hidden="true">{d.id === 'noor' ? '☾' : '❋'}</span><small>{d.id === 'bloom' ? 'LET’S CELEBRATE' : 'YOU ARE INVITED'}</small><span>{d.couple}</span><small>{d.date}</small></div><span className="preview-pill">Explore the design <span aria-hidden="true">↗</span></span></button><div className="design-title"><h3>{d.name}</h3><span>0{designs.indexOf(d) + 1}</span></div><p>{d.mood}</p></article>)}</div><p className="collection-note"><span aria-hidden="true">✧</span> A curated collection of invitation suites. Personalise, preview and publish your own celebration.</p>
    </section>
    <section className="experience" id="experience"><div className="wrap experience-grid"><div className="experience-art" aria-hidden="true"><div className="mini-card"><span>IT’S ALL IN THE DETAILS</span><div className="mini-flower">✧</div><p>A little reveal.<br/><em>A lasting memory.</em></p><div className="foil">A SURPRISE, JUST FOR YOU <b>✦</b></div><small>Something wonderful is on its way.</small></div><span className="art-note">More than an invitation.<br/>An experience.</span></div><div className="experience-copy"><div className="eyebrow">A JOY TO RECEIVE</div><h2>The kind of invitation<br/>you <em>don’t just scroll past.</em></h2><p>From that first seal to the final little detail, we’re creating an experience your guests will want to linger over.</p><div className="feature-row"><span>01</span><div><h3>A beautiful first impression</h3><p>A dimensional envelope. A golden wax seal. A moment of anticipation before your story unfolds.</p></div></div><div className="feature-row"><span>02</span><div><h3>Little touches, all your own</h3><p>Explore drifting petals, instrument-inspired music and scratch-to-reveal surprises in each invitation.</p></div></div><div className="feature-row"><span>03</span><div><h3>All the joy. Less of the organising.</h3><p>Ceremony details, venue directions and live RSVP collection, all in one seamless invitation.</p></div></div></div></div></section>
    <section className="wrap section-space" id="how-it-works"><div className="center-heading"><div className="eyebrow">FROM YOUR HEART TO THEIR SCREEN</div><h2>Make it yours.<em> Share the joy.</em></h2><p>Create and share in three simple steps.</p></div><div className="steps">{[['Choose your feeling', 'Explore the collection and find a design that speaks your language.', 'EXPLORE DESIGNS'], ['Tell your story', 'Add your names, photographs, venue location and personalized music.', 'LIVE IN EDITOR'], ['Bring everyone together', 'Share your private invitation link and collect guest RSVPs and wishes.', 'INSTANT PUBLISHING']].map(([title, desc, state], i) => <article key={title}><span className="step-number">0{i+1}</span><h3>{title}</h3><p>{desc}</p><small>{state}</small></article>)}</div></section>
    <section className="faq wrap"><div><div className="eyebrow">A FEW LITTLE ANSWERS</div><h2>Before the<br/><em>celebration begins.</em></h2></div><div className="faq-list">{[
      ['Can I try the designs right now?', 'Yes. Scroll to unfold the envelope above or choose any of the three designs to open its full invitation. Try the music, scratch reveal and demo RSVP.'],
      ['Can I personalise and publish my invitation?', 'Yes! You can create a free account, personalise names, dates, photos, venue location, and music in the editor, and publish your private invitation link to share with family and friends.'],
      ['Will it work on my guests’ phones?', 'The homepage and invitation designs adapt to phones, tablets and desktops.'],
      ['Can I turn off music and animations?', 'Yes. Invitations include music and particle controls. Opening animations and the homepage respect reduced motion. Music starts only when you press Play.']
    ].map(([q,a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
    <section className="closing wrap"><span aria-hidden="true">❋</span><div className="eyebrow">LET’S MAKE SOMETHING MEANINGFUL</div><h2>Your next chapter.<br/><em>Beautifully invited.</em></h2><a className="button primary" href="#designs">Discover the collection <span aria-hidden="true">↗</span></a><p>Made for your people. Remembered for the feeling.</p></section>
    </main><footer className="wrap"><div className="footer-top"><Brand/><p>A little tradition. A little magic.<br/>Every celebration, beautifully yours.</p><a href="#home">Back to the beginning ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Riwaayat Venue</span><div><button onClick={() => location.assign('/privacy')}>Privacy</button><button onClick={() => location.assign('/terms')}>Terms</button><button onClick={() => location.assign('/contact')}>Contact</button></div></div></footer>
    <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); setModal(null); }} onClick={e => { if(e.target === dialog.current) setModal(null); }} aria-labelledby="modal-title"><button className="dialog-close" onClick={() => setModal(null)} aria-label="Close preview">×</button>{modal ? <div className="notice"><div className="eyebrow">RIWAAYAT INVITATIONS</div><h2 id="modal-title">{modal === 'start' ? 'Create your celebration.' : modal === 'privacy' ? 'Privacy, by design.' : modal === 'terms' ? 'Clear terms. Thoughtful service.' : 'Let’s connect.'}</h2><p>{modal === 'start' ? 'You can explore our curated collection, create a free account, personalise every detail, and publish your private invitation link to share with family and friends.' : modal === 'privacy' ? 'Your private drafts and guest responses are protected. Guest replies are accessible only to the host, and passcode-protected invitations are encrypted zero-knowledge in your browser before saving.' : modal === 'terms' ? 'Riwaayat is a modern digital invitation platform for weddings, nikahs and bespoke celebrations. Accounts and invitations are free to create, customise and share.' : 'Have questions or feedback about Riwaayat? Get in touch with us through our contact form.'}</p><button className="button primary" onClick={() => {setModal(null); document.getElementById('designs')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});}}>Explore the designs <span aria-hidden="true">↗</span></button></div> : null}</dialog>
  </>;
}
const responseRoute=location.pathname.match(/^\/responses\/([a-f0-9-]{36})$/);
const editorRoute=location.pathname.match(/^\/edit\/([a-f0-9-]{36})$/);
const savedRoute=location.pathname.match(/^\/(draft|invite)\/([a-f0-9-]{36})$/);
const route = location.pathname.match(/^\/preview\/([^/]+)\/?$/);
const event = invitationEvents.find(item => item.id === route?.[1]);
createRoot(document.getElementById('root')!).render(<React.StrictMode>{location.pathname==='/data-controls'?<Suspense fallback={<main className="notice">Loading data controls…</main>}><DataControls/></Suspense>:['/privacy','/terms','/data-request'].includes(location.pathname)?<Suspense fallback={<main className="notice">Loading…</main>}><Legal page={location.pathname.slice(1) as 'privacy'|'terms'|'data-request'}/></Suspense>:location.pathname==='/contact'?<Suspense fallback={<main className="notice">Loading contact form…</main>}><Contact/></Suspense>:responseRoute?<Suspense fallback={<main className="notice">Loading guest responses…</main>}><Responses id={responseRoute[1]}/></Suspense>:editorRoute?<Suspense fallback={<main className="notice">Loading editor…</main>}><Editor id={editorRoute[1]}/></Suspense>:savedRoute?<Suspense fallback={<main className="notice">Loading invitation…</main>}><SavedInvitation id={savedRoute[2]} owner={savedRoute[1]==='draft'}/></Suspense>:location.pathname === '/account' ? <Suspense fallback={<main className="notice">Loading account services…</main>}><Account/></Suspense> : route ? event ? <Invitation event={event}/> : <MissingInvitation/> : location.pathname === '/' ? <App/> : <MissingInvitation/>}</React.StrictMode>);

