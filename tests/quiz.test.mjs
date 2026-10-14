import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {writeFile,unlink} from 'node:fs/promises';
const result=await build({entryPoints:['src/quiz-model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const file=new URL('../.quiz-test.mjs',import.meta.url);await writeFile(file,result.outputFiles[0].text);
let quizModel;try{quizModel=await import(file.href);}finally{await unlink(file);}
const {blankQuiz,newQuizQuestion,starterQuiz,publicQuiz,quizError,scoreQuiz,quizMessage}=quizModel;

test('the dedicated Couple Quiz template starts ready to customise',()=>{
 const quiz=starterQuiz();assert.equal(quiz.enabled,true);assert.equal(quiz.open,true);assert.equal(quiz.questions.length,3);assert.equal(quizError(quiz),'');
});

test('enabled quizzes require complete unique choices and a selected correct answer',()=>{
 const quiz=blankQuiz();quiz.enabled=true;assert.match(quizError(quiz),/between 1 and 10/);
 const question=newQuizQuestion('Where did we meet?');question.options[0].text='Lahore';question.options[1].text='Karachi';quiz.questions=[question];assert.equal(quizError(quiz),'');
 question.options[1].text=' lahore ';assert.match(quizError(quiz),/duplicate choices/);
});

test('public quiz strips correct answers and local scoring remains deterministic',()=>{
 const quiz=blankQuiz(),question=newQuizQuestion('Favourite city?');question.options[0].text='Lahore';question.options[1].text='Karachi';quiz.enabled=true;quiz.questions=[question];
 const published=publicQuiz(quiz);assert.equal('correctOptionId' in published.questions[0],false);
 assert.deepEqual(scoreQuiz(quiz,[{questionId:question.id,optionId:question.correctOptionId}]),{score:1,total:1});
 assert.match(quizMessage(1,1),/perfect/i);
});
