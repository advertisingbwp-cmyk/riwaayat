import { useEffect, useRef, useState } from 'react';
import { scrollPose } from './scrollTimeline';
import './scroll-hero.css';

type PreviewDesign = { id: string; name: string; image: string; couple: string; date: string };
const chapters = [
  { label: 'THE ANTICIPATION', title: <>Some moments<br/>deserve a<br/><em>beautiful beginning.</em></>, text: 'A little tradition. A little magic. Scroll to unfold an invitation that feels like you.' },
  { label: 'THE FIRST IMPRESSION', title: <>A golden seal.<br/><em>A little suspense.</em></>, text: 'Before the celebration, there’s this moment. A promise of something beautiful inside.' },
  { label: 'THE REVEAL', title: <>And then,<br/><em>your story unfolds.</em></>, text: 'Names that belong together. A date to remember. Your people, invited with love.' },
  { label: 'YOUR NEXT CHAPTER', title: <>One beautiful feeling.<br/><em>So many ways<br/>to make it yours.</em></>, text: 'Royal Heritage. Noor. Bloom. Sahar. Mehr. Find the beginning that belongs to your celebration.' },
];

export function ScrollHero({ designs, onPreview }: { designs: PreviewDesign[]; onPreview: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [disabled, setDisabled] = useState(false);
  const isStatic = reduced || disabled;

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0;
    let top = 0;
    let range = 1;
    let activeChapter = -1;
    let nearViewport = true;
    const render = () => {
      frame = 0;
      if (document.hidden || !nearViewport) return;
      const pose = scrollPose(isStatic ? 1 : (window.scrollY - top) / range);
      const variables: Record<string, string> = {
        '--story-progress': `${pose.progress}`,
        '--camera-x': `${pose.cameraX}deg`, '--camera-y': `${pose.cameraY}deg`, '--camera-z': `${pose.cameraZ}deg`,
        '--camera-scale': `${pose.cameraScale}`, '--flap-angle': `${-pose.flap * 178}deg`, '--flap-z': `${16 - pose.flap * 24}px`,
        '--seal-z': `${pose.seal * 180}px`, '--seal-y': `${pose.seal * -95}%`, '--seal-angle': `${pose.seal * 65}deg`,
        '--seal-opacity': `${pose.sealOpacity}`, '--card-y': `${pose.cardY}%`, '--card-z': `${4 + pose.lift * 6 + pose.fan * 50}px`, '--card-opacity': `${pose.cardOpacity}`,
        '--envelope-opacity': `${pose.envelopeOpacity}`, '--envelope-y': `${pose.fan * 45}%`,
        '--fan': `${pose.fan}`, '--side-opacity': `${pose.sideOpacity}`,
        '--halo-turn': `${pose.progress * 100}deg`, '--light-x': `${30 + pose.progress * 45}%`,
        '--scene-hue': `${pose.fan * 12}deg`,
      };
      for (const [key, value] of Object.entries(variables)) element.style.setProperty(key, value);
      element.dataset.chapter = String(pose.chapter);
      if (activeChapter !== pose.chapter) { activeChapter = pose.chapter; setChapter(pose.chapter); }
    };
    const schedule = () => { if (!frame && !document.hidden && nearViewport) frame = requestAnimationFrame(render); };
    const measure = () => {
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 80;
      element.style.setProperty('--story-header', `${headerHeight}px`);
      top = element.getBoundingClientRect().top + window.scrollY - headerHeight;
      range = Math.max(1, element.offsetHeight - (window.innerHeight - headerHeight));
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => { nearViewport = entry.isIntersecting; if (nearViewport) measure(); }, { rootMargin: '100px' });
    observer.observe(element);
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    const header = document.querySelector('.site-header');
    if (header) resize.observe(header);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', schedule);
    measure();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [isStatic]);

  function toggleMotion() {
    const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 80;
    const destination = (root.current?.getBoundingClientRect().top || 0) + window.scrollY - headerHeight;
    setDisabled(value => !value);
    window.scrollTo({ top: Math.max(0, destination), behavior: 'instant' });
  }

  return <section id="home" ref={root} className={`scroll-story ${isStatic ? 'story-static' : ''}`} aria-label="An invitation unfolding with your scroll">
    <div className="story-sticky">
      <div className="story-ambient" aria-hidden="true"/>
      <div className="story-topline"><span>AN INVITATION. A SMALL WORK OF HEART.</span><span>RIWAAYAT / THE FIRST COLLECTION</span></div>
      <div className="story-copy">
        <div className="eyebrow"><span className="chapter-numeral">0{(isStatic ? 3 : chapter) + 1}</span> {chapters[isStatic ? 3 : chapter].label}</div>
        {chapters.map((item, index) => <div key={item.label} className={`story-copy-chapter ${index === (isStatic ? 3 : chapter) ? 'chapter-active' : ''}`} aria-hidden={index !== (isStatic ? 3 : chapter)}>
          {index === 0 ? <h1>{item.title}</h1> : <h2>{item.title}</h2>}
          <p>{item.text}</p>
        </div>)}
        <div className="story-actions"><a className="button primary" href="#designs">Explore the collection <span aria-hidden="true">↗</span></a><button className="text-button" onClick={onPreview}>Take a little look <span aria-hidden="true">↗</span></button></div>
      </div>
      <div className="scroll-scene" aria-hidden="true">
        <div className="scene-aura"/><div className="scene-ring ring-a"/><div className="scene-ring ring-b"/>
        <div className="depth-mark mark-a">✧</div><div className="depth-mark mark-b">✦</div><div className="depth-mark mark-c">✧</div>
        <div className="scroll-camera">
          <div className="scene-envelope-body scene-envelope-back"/>
          <div className="scroll-flap"/>
          <div className="story-card side-card card-noor"><img src={designs[1].image} alt=""/><div><small>NOOR</small><span>☾</span><h3>{designs[1].couple}</h3><small>{designs[1].date}</small></div></div>
          <div className="story-card side-card card-bloom"><img src={designs[2].image} alt=""/><div><small>BLOOM</small><span>❋</span><h3>{designs[2].couple}</h3><small>{designs[2].date}</small></div></div>
          <div className="story-card center-card"><div className="engraved-border"/><span className="story-card-flower">❋</span><small>TOGETHER WITH OUR FAMILIES</small><h3>{designs[0].couple.split(' & ')[0]}<em>&</em>{designs[0].couple.split(' & ')[1]}</h3><span className="card-rule"/><p>We invite you to the beginning<br/>of our forever.</p><small>{designs[0].date}</small><span className="card-signoff">With love, always.</span></div>
          <div className="scene-envelope-body scene-envelope-front"><span>FOR YOU, WITH LOVE</span></div>
          <div className="scroll-seal"><div>R</div></div>
        </div>
        <div className="scene-floor"/>
        <span className="scene-bottom-label">{chapter === 3 || isStatic ? 'THREE STORIES. ONE BEAUTIFUL BEGINNING.' : 'A LITTLE TRADITION. A LITTLE MAGIC.'}</span>
      </div>
      <div className="story-bottom"><div className="scroll-cue"><span className="scroll-mouse" aria-hidden="true"/><span>{isStatic ? 'THE COLLECTION, UNFOLDED' : chapter === 3 ? 'KEEP SCROLLING TO EXPLORE' : 'SCROLL TO UNFOLD THE STORY'}</span></div><div className="chapter-track" aria-label={`Chapter ${(isStatic ? 3 : chapter) + 1} of 4`}>{chapters.map((item, index) => <span key={item.label} className={index <= (isStatic ? 3 : chapter) ? 'track-active' : ''}/>)}</div><div className="story-controls"><a href="#designs">Skip to designs ↓</a>{!reduced && <button onClick={toggleMotion} aria-pressed={disabled}>{disabled ? 'Enable scroll animation' : 'Turn animation off'}</button>}</div></div>
      <div className="story-progress" aria-hidden="true"/>
    </div>
  </section>;
}
