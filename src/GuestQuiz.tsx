import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {doc,serverTimestamp,setDoc} from 'firebase/firestore';
import {services} from './firebase';
import type {GuestAccess} from './GuestResponses';
import {quizMessage,type PublicQuiz,type QuizAnswer} from './quiz-model';

export function GuestQuiz({quiz,access}:{quiz:PublicQuiz;access:GuestAccess}){
 const storageKey=`riwaayat_quiz_${access.id}`;
 const [name,setName]=useState(''),[consent,setConsent]=useState(false),[started,setStarted]=useState(false),[index,setIndex]=useState(0),[answers,setAnswers]=useState<QuizAnswer[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<number|null>(null);
 const resultRef=useRef<HTMLDivElement>(null);
 const question=quiz.questions[index];
 const progress=useMemo(()=>quiz.questions.length?Math.round((index+1)/quiz.questions.length*100):0,[index,quiz.questions.length]);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved.score==='number'&&saved.total===quiz.questions.length){setName(String(saved.name||''));setResult(saved.score);}}catch{}},[storageKey,quiz.questions.length]);
 useEffect(()=>{if(result!==null)resultRef.current?.focus();},[result]);
 function begin(e:FormEvent){e.preventDefault();if(!name.trim()||!consent)return;setStarted(true);setError('');}
 function choose(optionId:string){
  const next=[...answers,{questionId:question.id,optionId}];setAnswers(next);
  if(index<quiz.questions.length-1)setTimeout(()=>setIndex(index+1),180);else void submit(next);
 }
 async function submit(finalAnswers:QuizAnswer[]){
  if(!services)return;setBusy(true);setError('');const attemptId=crypto.randomUUID();
  const base={id:attemptId,displayName:name.trim(),answers:finalAnswers,questionCount:quiz.questions.length,consent:true,...(access.private?{guestToken:access.token}:{})};
  try{
   let accepted:number|null=null;
   for(let candidate=quiz.questions.length;candidate>=0;candidate--){
    try{await setDoc(doc(services.db,'events',access.id,'quizAttempts',attemptId),{...base,score:candidate,createdAt:serverTimestamp()});accepted=candidate;break;}catch(e){const code=(e as {code?:string}).code||'';if(!code.includes('permission-denied'))throw e;}
   }
   if(accepted===null)throw new Error('permission-denied');
   setResult(accepted);localStorage.setItem(storageKey,JSON.stringify({score:accepted,total:quiz.questions.length,name:name.trim()}));
  }catch(e){const code=(e as {code?:string}).code||'';setError(code.includes('permission-denied')?'The quiz is closed, changed, or your guest access expired. Reopen the invitation and try again.':'Your answers could not be saved. Please try again.');}
  finally{setBusy(false);}
 }
 function restart(){setStarted(false);setIndex(0);setAnswers([]);setResult(null);setError('');setConsent(false);localStorage.removeItem(storageKey);}
 if(!quiz.enabled)return null;
 return <section className="inv-section couple-quiz-section" id="couple-quiz"><div className="inv-section-heading"><span className="inv-kicker">A LITTLE GAME FOR OUR PEOPLE</span><h2>{quiz.title}</h2><p>{quiz.intro}</p></div><div className="quiz-stage">
  {!quiz.open&&result===null?<div className="quiz-closed"><span aria-hidden="true">✦</span><h3>The quiz is now closed.</h3><p>Thank you to everyone who joined the fun.</p></div>:result!==null?<div className="quiz-result" ref={resultRef} tabIndex={-1} role="status"><div className="quiz-confetti" aria-hidden="true">✦ ❋ ✧ ❋ ✦</div><span className="quiz-score">{result}<small>/{quiz.questions.length}</small></span><h3>{quizMessage(result,quiz.questions.length)}</h3><p>Your result has been saved privately for the host.</p><div className="quiz-result-actions"><button className="inv-button" onClick={restart}>Play again</button>{navigator.share?<button className="inv-text-button" onClick={()=>void navigator.share({title:quiz.title,text:`I scored ${result}/${quiz.questions.length} in the couple quiz!`,url:location.href})}>Share my score ↗</button>:<button className="inv-text-button" onClick={()=>void navigator.clipboard.writeText(location.href)}>Copy quiz link</button>}</div></div>:!started?<form className="quiz-welcome" onSubmit={begin}><div className="quiz-card-mark" aria-hidden="true">?</div><label>Your display name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={60} autoComplete="name" placeholder="e.g. Ayesha"/></label><label className="quiz-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/>I agree to share my display name, answers and score privately with the invitation host.</label><button className="inv-button">Start the quiz <span aria-hidden="true">→</span></button></form>:question?<div className={`quiz-question-card ${busy?'is-busy':''}`} style={{'--quiz-progress':`${progress}%`} as React.CSSProperties}><div className="quiz-progress"><span style={{width:`${progress}%`}}/><small>Question {index+1} of {quiz.questions.length}</small></div><span className="quiz-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><h3>{question.prompt}</h3><div className="quiz-options">{question.options.map((option,optionIndex)=><button type="button" key={option.id} disabled={busy} onClick={()=>choose(option.id)}><span>{String.fromCharCode(65+optionIndex)}</span>{option.text}</button>)}</div>{busy&&<p role="status">Checking your answers…</p>}</div>:null}
  {error&&<p className="quiz-error" role="alert">{error}</p>}
 </div></section>;
}
