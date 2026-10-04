import {useEffect,type RefObject} from 'react';

/** Progressive enhancement: content stays visible without animation support. */
export function useSaharScroll(page:RefObject<HTMLDivElement|null>,enabled:boolean,reduced:boolean) {
  useEffect(()=>{
    const root=page.current;
    if(!root||!enabled||reduced||!('IntersectionObserver' in window))return;
    const items=Array.from(root.querySelectorAll<HTMLElement>('.inv-section-heading,.inv-story-grid article,.inv-itinerary article,.inv-gallery button,.inv-venue-image'));
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('sahar-visible');observer.unobserve(entry.target);}});
    },{threshold:0.08});
    items.forEach(item=>{item.classList.add('sahar-reveal');observer.observe(item);});
    return ()=>{observer.disconnect();items.forEach(item=>item.classList.remove('sahar-reveal','sahar-visible'));};
  },[page,enabled,reduced]);
}
