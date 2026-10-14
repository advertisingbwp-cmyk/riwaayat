export type QuizOption={id:string;text:string};
export type QuizQuestion={id:string;prompt:string;options:QuizOption[];correctOptionId:string};
export type QuizConfig={enabled:boolean;open:boolean;title:string;intro:string;questions:QuizQuestion[]};
export type PublicQuizQuestion=Omit<QuizQuestion,'correctOptionId'>;
export type PublicQuiz={enabled:boolean;open:boolean;title:string;intro:string;questions:PublicQuizQuestion[]};
export type QuizAnswer={questionId:string;optionId:string};

const option=(text:string):QuizOption=>({id:crypto.randomUUID(),text});
export function newQuizQuestion(prompt=''):QuizQuestion{
 const options=[option(''),option('')];
 return {id:crypto.randomUUID(),prompt,options,correctOptionId:options[0].id};
}
export function blankQuiz():QuizConfig{
 return {enabled:false,open:true,title:'How well do you know us?',intro:'A few little questions about our story. Have fun!',questions:[]};
}
export function starterQuiz():QuizConfig{
 const make=(prompt:string,choices:string[],correct:number):QuizQuestion=>{const options=choices.map(option);return {id:crypto.randomUUID(),prompt,options,correctOptionId:options[correct].id};};
 return {enabled:true,open:true,title:'How well do you know us?',intro:'A few little questions about our story. Have fun!',questions:[
  make('Who sent the first message?',['Ayesha','Hamza','A mutual friend'],1),
  make('What is our favourite kind of evening?',['A long drive and chai','A crowded concert','An early night'],0),
  make('Who is more likely to arrive early?',['Ayesha','Hamza','Neither of us'],0),
 ]};
}
export function normalizeQuiz(value:unknown):QuizConfig{
 if(!value||typeof value!=='object')return blankQuiz();
 const quiz=value as Partial<QuizConfig>;
 return {
  enabled:quiz.enabled===true,
  open:quiz.open!==false,
  title:typeof quiz.title==='string'?quiz.title:'How well do you know us?',
  intro:typeof quiz.intro==='string'?quiz.intro:'A few little questions about our story. Have fun!',
  questions:Array.isArray(quiz.questions)?quiz.questions.map(question=>({
   id:String(question?.id||crypto.randomUUID()),prompt:String(question?.prompt||''),
   options:Array.isArray(question?.options)?question.options.map(choice=>({id:String(choice?.id||crypto.randomUUID()),text:String(choice?.text||'')})):[],
   correctOptionId:String(question?.correctOptionId||'')
  })).slice(0,10):[]
 };
}
export function publicQuiz(quiz:QuizConfig):PublicQuiz{
 return {...quiz,questions:quiz.questions.map(({correctOptionId:_,...question})=>question)};
}
export function quizError(quiz:QuizConfig){
 if(!quiz.enabled)return '';
 if(!quiz.title.trim()||quiz.title.trim().length>100)return 'Add a quiz title of up to 100 characters.';
 if(quiz.intro.trim().length>240)return 'Keep the quiz introduction under 240 characters.';
 if(quiz.questions.length<1||quiz.questions.length>10)return 'Add between 1 and 10 quiz questions.';
 for(const [index,question] of quiz.questions.entries()){
  if(!question.prompt.trim()||question.prompt.trim().length>160)return `Complete question ${index+1} and keep it under 160 characters.`;
  if(question.options.length<2||question.options.length>4)return `Question ${index+1} needs 2 to 4 choices.`;
  if(question.options.some(choice=>!choice.text.trim()||choice.text.trim().length>100))return `Complete every choice in question ${index+1}.`;
  if(new Set(question.options.map(choice=>choice.text.trim().toLowerCase())).size!==question.options.length)return `Question ${index+1} has duplicate choices.`;
  if(!question.options.some(choice=>choice.id===question.correctOptionId))return `Choose the correct answer for question ${index+1}.`;
 }
 return '';
}
export function scoreQuiz(quiz:QuizConfig|PublicQuiz,answers:QuizAnswer[]){
 const correct='correctOptionId' in (quiz.questions[0]||{})?quiz.questions.reduce((score,question,index)=>score+(answers[index]?.questionId===question.id&&answers[index]?.optionId===(question as QuizQuestion).correctOptionId?1:0),0):0;
 return {score:correct,total:quiz.questions.length};
}
export function quizMessage(score:number,total:number){
 const ratio=total?score/total:0;
 if(ratio===1)return 'A perfect score — you know our story by heart!';
 if(ratio>=.7)return 'So close to perfect — you know us wonderfully well.';
 if(ratio>=.4)return 'A lovely try — there are still a few stories to share.';
 return 'Every celebration needs a little mystery. Thanks for playing!';
}
