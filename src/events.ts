export type Instrument = 'Sitar' | 'Guitar' | 'Oud' | 'Piano';
export type InvitationEvent = {
  effects?: {opening:boolean;particles:boolean;music:boolean;scratch:boolean};
  id: 'royal' | 'noor' | 'bloom' | 'sahar'; name: string; category: string; mood: string;
  couple: string; note: string; image: string; startsAt: string; timeZone: string;
  intro: string; quote: string; hashtag: string; dressCode: string; instrument: Instrument;
  particle: 'petals' | 'stars' | 'leaves'; venue: {name: string; address: string; mapQuery: string};
  story: {year: string; title: string; text: string}[];
  ceremonies: {id: string; title: string; startsAt: string; place: string; attire: string}[];
  gallery: {src: string; alt: string}[];
  venueImage?: string;
  imagePosition?: string;
  venueImagePosition?: string;
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
  {
    id:'sahar',name:'Sahar',category:'Nikah & Walima',mood:'From a quiet evening to a lifetime of light.',
    couple:'Daniyal & Inaya',note:'Together with our families, we invite you to an evening of love, laughter and new beginnings.',
    image:'/images/royal-2.webp',startsAt:'2027-02-14T17:30:00+05:00',timeZone:'Asia/Karachi',
    intro:'Every beautiful beginning has its own light.',quote:'And then, every ordinary day became a little more extraordinary.',
    hashtag:'#DaniyalAndInaya',dressCode:'Midnight blue, warm ivory & a touch of silver',instrument:'Piano',particle:'stars',
    venue:{name:'The Sahar Terrace',address:'Islamabad, Pakistan · fictional sample venue',mapQuery:'Islamabad Pakistan'},
    venueImage:'/images/noor-3.webp',
    story:[{year:'2022',title:'The first hello',text:'One conversation became another. Somewhere between the laughter and the long walks, we found a familiar kind of peace.'},{year:'2025',title:'Choosing each other',text:'Through changing seasons and everyday adventures, our favourite place became wherever we were together.'},{year:'2027',title:'A new dawn',text:'Now we begin a new chapter, surrounded by the people who have been part of our story all along.'}],
    ceremonies:[{id:'welcome',title:'Golden hour welcome',startsAt:'2027-02-14T17:30:00+05:00',place:'The terrace',attire:'Midnight blue & ivory'},{id:'nikah',title:'Our Nikah',startsAt:'2027-02-14T18:00:00+05:00',place:'The garden pavilion',attire:'Elegant occasion wear'},{id:'dinner',title:'Dinner beneath the stars',startsAt:'2027-02-14T19:30:00+05:00',place:'The Sahar Terrace',attire:'Stay for the evening'}],
    gallery:[{src:'/images/royal-1.webp',alt:'Sample wedding celebration photograph'},{src:'/images/noor-2.webp',alt:'Sample evening celebration photograph'},{src:'/images/noor-3.webp',alt:'Sample celebration setting'},{src:'/images/royal-4.webp',alt:'Sample wedding detail photograph'}],
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
