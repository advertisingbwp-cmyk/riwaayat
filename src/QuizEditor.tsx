import type {Dispatch,SetStateAction} from 'react';
import {newQuizQuestion,quizError,type QuizConfig} from './quiz-model';

export function QuizEditor({quiz,setQuiz}:{quiz:QuizConfig;setQuiz:Dispatch<SetStateAction<QuizConfig>>}){
 const patch=<K extends keyof QuizConfig>(key:K,value:QuizConfig[K])=>setQuiz(old=>({...old,[key]:value}));
 const error=quizError(quiz);
 return <section className="editor-quiz" aria-labelledby="quiz-editor-heading">
  <div className="editor-quiz-heading"><div><span className="eyebrow">YOUR INTERACTIVE INVITATION</span><h2 id="quiz-editor-heading">Couple Quiz questions</h2><p>This template is built around your quiz. Guests can open the shared invitation and play without creating an account.</p></div></div>
  <div className="editor-quiz-body">
   <div className="editor-checkboxes"><label><input type="checkbox" checked={quiz.open} onChange={e=>patch('open',e.target.checked)}/>Accept new quiz attempts</label></div>
   <label>Quiz title<input value={quiz.title} required maxLength={100} onChange={e=>patch('title',e.target.value)}/></label>
   <label>Short introduction<textarea value={quiz.intro} maxLength={240} rows={3} onChange={e=>patch('intro',e.target.value)}/></label>
   <div className="editor-quiz-list">{quiz.questions.map((question,index)=><article className="editor-quiz-question" key={question.id}>
    <div className="editor-quiz-question-head"><strong>Question {index+1}</strong><div><button type="button" disabled={index===0} onClick={()=>patch('questions',quiz.questions.map((row,i)=>i===index-1?question:i===index-1+1?quiz.questions[index-1]:row))}>↑</button><button type="button" disabled={index===quiz.questions.length-1} onClick={()=>{const rows=[...quiz.questions];[rows[index],rows[index+1]]=[rows[index+1],rows[index]];patch('questions',rows);}}>↓</button><button type="button" onClick={()=>patch('questions',quiz.questions.filter(row=>row.id!==question.id))}>Remove</button></div></div>
    <label>Question<input value={question.prompt} maxLength={160} required onChange={e=>patch('questions',quiz.questions.map(row=>row.id===question.id?{...row,prompt:e.target.value}:row))}/></label>
    <fieldset><legend>Answer choices — select the correct one</legend>{question.options.map((choice,choiceIndex)=><div className="editor-quiz-choice" key={choice.id}><input type="radio" name={`correct-${question.id}`} checked={question.correctOptionId===choice.id} onChange={()=>patch('questions',quiz.questions.map(row=>row.id===question.id?{...row,correctOptionId:choice.id}:row))} aria-label={`Mark choice ${choiceIndex+1} correct`}/><input value={choice.text} maxLength={100} required placeholder={`Choice ${choiceIndex+1}`} onChange={e=>patch('questions',quiz.questions.map(row=>row.id===question.id?{...row,options:row.options.map(option=>option.id===choice.id?{...option,text:e.target.value}:option)}:row))}/>{question.options.length>2&&<button type="button" aria-label={`Remove choice ${choiceIndex+1}`} onClick={()=>patch('questions',quiz.questions.map(row=>row.id===question.id?{...row,options:row.options.filter(option=>option.id!==choice.id),correctOptionId:row.correctOptionId===choice.id?row.options.find(option=>option.id!==choice.id)!.id:row.correctOptionId}:row))}>×</button>}</div>)}<button type="button" disabled={question.options.length>=4} onClick={()=>{const choice={id:crypto.randomUUID(),text:''};patch('questions',quiz.questions.map(row=>row.id===question.id?{...row,options:[...row.options,choice]}:row));}}>+ Add choice</button></fieldset>
   </article>)}</div>
   <button type="button" disabled={quiz.questions.length>=10} onClick={()=>patch('questions',[...quiz.questions,newQuizQuestion()])}>+ Add quiz question</button>
   {error&&<p className="account-error" role="alert">{error}</p>}
  </div>
 </section>;
}
