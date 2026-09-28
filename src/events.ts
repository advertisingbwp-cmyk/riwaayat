export type Instrument = 'Sitar' | 'Guitar' | 'Oud' | 'Piano';
export type InvitationEvent = {
  effects?: {opening:boolean;particles:boolean;music:boolean;scratch:boolean};
  id: 'royal' | 'noor' | 'bloom'; name: string; category: string; mood: string;
  couple: string; note: string; image: string; startsAt: string; timeZone: string;
  intro: string; quote: string; hashtag: string; dressCode: string; instrument: Instrument;
  particle: 'petals' | 'stars' | 'leaves'; venue: {name: string; address: string; mapQuery: string};
  story: {year: string; title: string; text: string}[];
  ceremonies: {id: string; title: string; startsAt: string; place: string; attire: string}[];
  gallery: {src: string; alt: string}[];
};

export const invitationEvents: InvitationEvent[] = [
  {
    id: 'royal', name: 'Royal Heritage', category: 'Indian wedding', mood: 'A love fit for a royal celebration.',
    couple: 'Aarav & Meera', note: 'Together with their families, invite you to celebrate their wedding.',
    image: '/images/royal.webp', startsAt: '2026-12-10T18:00:00+05:30', timeZone: 'Asia/Kolkata',
    intro: 'Two hearts. A thousand blessings.', quote: 'In every lifetime, in every story, it would still be you.',
    hashtag: '#AaravAndMeera', dressCode: 'Heritage silks, warm crimson & antique gold', instrument: 'Sitar', particle: 'petals',
    venue: {name: 'Umaid Bhawan Palace', address: 'Circuit House Road, Jodhpur, Rajasthan, India', mapQuery: 'Umaid Bhawan Palace Jodhpur'},
    story: [{year:'2021',title:'A chance encounter',text:'A mutual friend, a long conversation, and the quiet feeling that something wonderful had begun.'},{year:'2024',title:'A thousand little moments',text:'Coffee dates became road trips. Two separate lives became one shared adventure.'},{year:'2026',title:'A forever kind of yes',text:'Now, surrounded by the people who made us who we are, we begin our next chapter.'}],
    ceremonies: [{id:'mehendi',title:'Mehendi & melodies',startsAt:'2026-12-09T16:00:00+05:30',place:'Palace gardens',attire:'Festive greens & florals'},{id:'sangeet',title:'An evening of Sangeet',startsAt:'2026-12-09T19:30:00+05:30',place:'Royal ballroom',attire:'A little sparkle'},{id:'wedding',title:'The wedding ceremony',startsAt:'2026-12-10T18:00:00+05:30',place:'Palace courtyard',attire:'Crimson & antique gold'},{id:'dinner',title:'Dinner under the stars',startsAt:'2026-12-10T20:30:00+05:30',place:'Palace lawns',attire:'Continue in your ceremony attire'}],
    gallery: [1,2,3,4].map(n=>({src:`/images/royal-${n}.webp`,alt:`Royal Heritage wedding inspiration, photograph ${n}`})),
  },
  {
    id:'noor', name:'Noor', category:'Nikah & Walima', mood:'Under the stars. Written in the heart.',
    couple:'Zain & Ayla',note:'With grateful hearts, we invite you to share in the joy of our Nikah.',
    image:'/images/noor.webp',startsAt:'2026-12-20T17:00:00+05:00',timeZone:'Asia/Karachi',
    intro:'Written in the stars. Held in our hearts.',quote:'A new chapter, begun with gratitude and surrounded by love.',
    hashtag:'#ZainAndAyla',dressCode:'Elegant emerald, ivory & soft gold',instrument:'Oud',particle:'stars',
    venue:{name:'The Noor Courtyard',address:'Lahore, Punjab, Pakistan · fictional sample venue',mapQuery:'Lahore Pakistan'},
    story:[{year:'2022',title:'An introduction',text:'Our families brought us together. Kindness and conversation made us choose to stay.'},{year:'2025',title:'A shared intention',text:'We found joy in the same small things, and hope in the same kind of future.'},{year:'2026',title:'Our new beginning',text:'With the blessings of our families, we look forward to a lifetime of companionship.'}],
    ceremonies:[{id:'welcome',title:'Family welcome',startsAt:'2026-12-20T16:30:00+05:00',place:'Courtyard reception',attire:'Emerald, ivory & soft gold'},{id:'nikah',title:'The Nikah',startsAt:'2026-12-20T17:00:00+05:00',place:'Jasmine pavilion',attire:'Modest occasion wear'},{id:'walima',title:'Walima gathering',startsAt:'2026-12-21T19:00:00+05:00',place:'The Noor Courtyard',attire:'Elegant evening wear'}],
    gallery:[1,2,3,4].map(n=>({src:`/images/noor-${n}.webp`,alt:`Noor celebration inspiration, photograph ${n}`})),
  },
  {
    id:'bloom',name:'Bloom',category:'Birthday celebration',mood:'Another year. A beautiful new chapter.',
    couple:'Aria turns 21',note:'A little sparkle, a lot of laughter. Join us for a birthday to remember.',
    image:'/images/bloom.webp',startsAt:'2027-01-16T18:00:00+05:30',timeZone:'Asia/Kolkata',
    intro:'Here’s to the next beautiful chapter.',quote:'Collect the moments. Make a little magic. Dance a little longer.',
    hashtag:'#AriaInBloom',dressCode:'Pastels, playful details & dancing shoes',instrument:'Piano',particle:'leaves',
    venue:{name:'The Bloom Garden',address:'Bengaluru, Karnataka, India · fictional sample venue',mapQuery:'Bengaluru India'},
    story:[{year:'THE LITTLE THINGS',title:'More laughter',text:'A table full of friends, stories told twice, and laughter that lasts all night.'},{year:'THE BIG FEELINGS',title:'More adventures',text:'Here’s to saying yes, trying something new, and making room for the unexpected.'},{year:'THE NEXT CHAPTER',title:'Twenty-one, together',text:'My favourite part of growing up is getting to share it with all of you.'}],
    ceremonies:[{id:'hello',title:'Hello, lovely people',startsAt:'2027-01-16T18:00:00+05:30',place:'Garden lounge',attire:'Pastels & playful details'},{id:'cake',title:'Candles & wishes',startsAt:'2027-01-16T19:00:00+05:30',place:'Dessert garden',attire:'Bring your biggest smile'},{id:'dance',title:'Dinner, then dancing',startsAt:'2027-01-16T19:30:00+05:30',place:'Garden terrace',attire:'Dancing shoes encouraged'}],
    gallery:[1,2,3,4].map(n=>({src:`/images/bloom-${n}.webp`,alt:`Bloom birthday inspiration, photograph ${n}`})),
  },
];

export function formatEventDate(iso: string, timeZone: string, time = false) {
  return new Intl.DateTimeFormat('en-GB', {timeZone, day:'numeric', month:'long',year:'numeric', ...(time ? {hour:'numeric' as const,minute:'2-digit' as const,hour12:true} : {})}).format(new Date(iso));
}
export const designs = invitationEvents.map(event => ({...event, date:formatEventDate(event.startsAt,event.timeZone).toUpperCase()}));

export function countdownParts(startsAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(startsAt) - now) / 1000));
  return {started:seconds === 0, days:Math.floor(seconds/86400),hours:Math.floor(seconds%86400/3600),minutes:Math.floor(seconds%3600/60),seconds:seconds%60};
}
