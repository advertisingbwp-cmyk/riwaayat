import { useEffect, useRef, useState } from 'react';
import type { Instrument, InvitationEvent } from './events';

export function useReducedMotion() {
  const [reduced,setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const query=matchMedia('(prefers-reduced-motion: reduce)'); const change=()=>setReduced(query.matches); query.addEventListener('change',change); return ()=>query.removeEventListener('change',change); },[]);
  return reduced;
}

export function Particles({kind,enabled}:{kind:InvitationEvent['particle'];enabled:boolean}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const node=canvas.current;
    if(!node || !enabled) return;
    const ctx=node.getContext('2d'); if(!ctx) return;
    let width=innerWidth,height=innerHeight,frame=0,last=0;
    const items=Array.from({length:innerWidth<600?18:30},()=>({x:Math.random(),y:Math.random(),r:3+Math.random()*5,speed:9+Math.random()*15,angle:Math.random()*Math.PI*2,phase:Math.random()*6}));
    const resize=()=>{width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio,1.5);node.width=width*dpr;node.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};
    const draw=(now:number)=>{
      if(document.hidden) {frame=0;return;}
      frame=requestAnimationFrame(draw);
      if(last && now-last<32) return;
      const delta=Math.min((now-(last||now))/1000,.07);last=now;ctx.clearRect(0,0,width,height);
      for(const item of items){
        item.phase+=delta*.7;item.angle+=delta*.2;
        if(kind!=='stars') item.y+=item.speed*delta/height;
        if(item.y>1.04) {item.y=-.04;item.x=Math.random();}
        ctx.save();ctx.translate(item.x*width+Math.sin(item.phase)*20,item.y*height);ctx.rotate(item.angle);
        ctx.globalAlpha=kind==='stars'?.2+(Math.sin(item.phase)+1)*.22:.42;
        ctx.fillStyle=kind==='petals'?'#c87d89':kind==='leaves'?'#799984':'#d8bf7b';
        ctx.beginPath();
        if(kind==='stars') {ctx.moveTo(0,-item.r);ctx.lineTo(item.r*.25,-item.r*.25);ctx.lineTo(item.r,0);ctx.lineTo(item.r*.25,item.r*.25);ctx.lineTo(0,item.r);ctx.lineTo(-item.r*.25,item.r*.25);ctx.lineTo(-item.r,0);ctx.lineTo(-item.r*.25,-item.r*.25);}
        else if(kind==='leaves') ctx.ellipse(0,0,item.r*.55,item.r*1.5,0,0,Math.PI*2);
        else {ctx.moveTo(0,-item.r);ctx.bezierCurveTo(item.r*2,-item.r,item.r,item.r*2,0,item.r);ctx.bezierCurveTo(-item.r*1.5,item.r,-item.r,-item.r,0,-item.r);}
        ctx.closePath();ctx.fill();ctx.restore();
      }
    };
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;last=0;if(!document.hidden)frame=requestAnimationFrame(draw);};
    resize();visibility();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);
    return ()=>{cancelAnimationFrame(frame);ctx.clearRect(0,0,width,height);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);};
  },[kind,enabled]);
  return <canvas className="inv-particles" ref={canvas} aria-hidden="true"/>;
}

class Soundtrack {
  context: AudioContext;
  master: GainNode;
  timer: ReturnType<typeof setInterval> | undefined;
  voices = new Set<OscillatorNode>();
  private disposed=false;
  private next=0;
  private step=0;
  constructor(private instrument:Instrument,volume:number){
    this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=volume*.18;this.master.connect(this.context.destination);
  }
  async start(){await this.context.resume();if(this.disposed)return;this.next=this.context.currentTime+.05;this.schedule();this.timer=setInterval(()=>this.schedule(),150);}
  setVolume(volume:number){this.master.gain.setTargetAtTime(volume*.18,this.context.currentTime,.05);}
  private schedule(){
    const notes=[0,7,12,4,9,7,4,2,0,7,14,12,9,7,4,2];
    while(this.next<this.context.currentTime+.35){
      const frequency=220*2**(notes[this.step%notes.length]/12);
      const t=this.next;
      const decay=this.instrument==='Piano'?1.6:this.instrument==='Guitar'?1.1:.8;
      const harmonics=this.instrument==='Sitar'?[1,2,3,5]:this.instrument==='Oud'?[1,2,3]:this.instrument==='Guitar'?[1,2]:[1,2,4];
      harmonics.forEach((harmonic,index)=>{
        const oscillator=this.context.createOscillator();const envelope=this.context.createGain();
        oscillator.type=this.instrument==='Oud'&&index===0?'triangle':'sine';oscillator.frequency.value=frequency*harmonic;
        if(this.instrument==='Sitar')oscillator.detune.value=index%2===0?2:-3;
        envelope.gain.setValueAtTime(.0001,t);envelope.gain.exponentialRampToValueAtTime(.52/(harmonic*harmonic),t+.015);envelope.gain.exponentialRampToValueAtTime(.0001,t+decay);
        oscillator.connect(envelope);envelope.connect(this.master);this.voices.add(oscillator);
        oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();this.voices.delete(oscillator);};
        oscillator.start(t);oscillator.stop(t+decay+.03);
      });
      this.next+=.55;this.step++;
    }
  }
  stop(){
    if(this.disposed)return;this.disposed=true;clearInterval(this.timer);for(const voice of this.voices){try{voice.stop();}catch{/* Already stopped. */}}this.voices.clear();void this.context.close();
  }
}

export function MusicControls({initial}:{initial:Instrument}) {
  const [instrument,setInstrument]=useState<Instrument>(initial);
  const [playing,setPlaying]=useState(false);
  const [volume,setVolume]=useState(.3);
  const [error,setError]=useState('');
  const player=useRef<Soundtrack|null>(null);
  const stop=()=>{player.current?.stop();player.current=null;setPlaying(false);};
  useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);return ()=>{document.removeEventListener('visibilitychange',hidden);player.current?.stop();player.current=null;};},[]);
  async function toggle(){
    if(player.current){stop();return;}
    setError('');
    try { const sound=new Soundtrack(instrument,volume);player.current=sound;await sound.start();if(player.current===sound)setPlaying(true);else sound.stop(); }
    catch {stop();setError('Audio is unavailable in this browser. You can still enjoy the invitation.');}
  }
  return <div className="inv-music"><button className="inv-small-button" onClick={toggle} aria-pressed={playing}>{playing?'❚❚ Pause music':'♫ Play music'}</button><label><span className="sr-only">Music instrument</span><select value={instrument} onChange={e=>{stop();setInstrument(e.target.value as Instrument);}}>{['Sitar','Guitar','Oud','Piano'].map(name=><option key={name}>{name}</option>)}</select></label><label className="inv-volume"><span className="sr-only">Music volume</span><input aria-label="Music volume" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>{const v=Number(e.target.value);setVolume(v);player.current?.setVolume(v);}}/></label>{error&&<span role="status">{error}</span>}<span className="sr-only">Instrument-inspired synthesized music. Pauses when this tab is hidden.</span></div>;
}

export function ScratchCard({hashtag,dressCode}:{hashtag:string;dressCode:string}) {
  const [revealed,setRevealed]=useState(false);
  const ref=useRef<HTMLCanvasElement>(null);
  const point=useRef<{x:number;y:number}|null>(null);
  useEffect(()=>{
    const node=ref.current;if(!node || revealed)return;
    const ctx=node.getContext('2d',{willReadFrequently:true});if(!ctx)return;
    const paint=()=>{
      const {width,height}=node.getBoundingClientRect();const dpr=Math.min(devicePixelRatio,2);node.width=width*dpr;node.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.globalCompositeOperation='source-over';const gradient=ctx.createLinearGradient(0,0,width,height);gradient.addColorStop(0,'#9e783b');gradient.addColorStop(.4,'#e1c789');gradient.addColorStop(.65,'#b49553');gradient.addColorStop(1,'#d9be7e');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      ctx.fillStyle='#594321';ctx.textAlign='center';ctx.font='26px Georgia';ctx.fillText('✦',width/2,height/2-20);ctx.font='12px sans-serif';ctx.fillText('A LITTLE SECRET, JUST FOR YOU',width/2,height/2+12);ctx.font='11px sans-serif';ctx.fillText('Scratch with your finger or mouse',width/2,height/2+37);point.current=null;
    };
    const observer=new ResizeObserver(paint);observer.observe(node);paint();return ()=>observer.disconnect();
  },[revealed]);
  function draw(e:React.PointerEvent<HTMLCanvasElement>){
    if(!point.current)return;const node=e.currentTarget;const rect=node.getBoundingClientRect();const ctx=node.getContext('2d');if(!ctx)return;
    const x=e.clientX-rect.left,y=e.clientY-rect.top;ctx.globalCompositeOperation='destination-out';ctx.lineWidth=42;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(point.current.x,point.current.y);ctx.lineTo(x,y);ctx.stroke();point.current={x,y};
  }
  function finish(e:React.PointerEvent<HTMLCanvasElement>){
    point.current=null;const node=e.currentTarget;if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);const ctx=node.getContext('2d');if(!ctx)return;
    const pixels=ctx.getImageData(0,0,node.width,node.height).data;let clear=0,total=0;for(let i=3;i<pixels.length;i+=128){total++;if(pixels[i]<40)clear++;}if(clear/total>.4)setRevealed(true);
  }
  return <div className="scratch-wrap"><div className={`scratch-card ${revealed?'revealed':''}`}><div className="scratch-secret" aria-hidden={!revealed}><small>THE LITTLE DETAILS</small><h3>{hashtag}</h3><p>{dressCode}</p></div>{!revealed&&<canvas ref={ref} aria-hidden="true" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();point.current={x:e.clientX-r.left,y:e.clientY-r.top};draw(e);}} onPointerMove={draw} onPointerUp={finish} onPointerCancel={()=>{point.current=null;}}/>}</div><button className="inv-text-button" onClick={()=>setRevealed(value=>!value)}>{revealed?'Cover the surprise again':'Reveal without scratching'} <span aria-hidden="true">↗</span></button><p className="sr-only" role="status">{revealed?`${hashtag}. Dress code: ${dressCode}`:''}</p></div>;
}
