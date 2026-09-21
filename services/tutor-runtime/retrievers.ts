import type { TutorCandidate, TutorSourceAccess } from '../../contracts/tutor-runtime';

const TOKEN=/[a-zA-Z0-9_]+|[\u4e00-\u9fff]{2,}/g;
const STOP=new Set(['a','an','and','are','before','does','for','how','in','is','it','of','or','should','the','to','what','when','where','why']);
const LEARNING_TERMS=['learning path','study','roadmap','next','学习路径','下一步','先学'];

function tokens(text:string):string[] {
  return (text.match(TOKEN)??[]).map(x=>x.toLowerCase()).filter(x=>!STOP.has(x));
}

export type CourseDoc=TutorSourceAccess & Readonly<{id:string;title:string;text:string;sourcePath:string;tags?:readonly string[]}>;
export type CodeSymbol=TutorSourceAccess & Readonly<{id:string;symbolName:string;symbolType:string;text:string;sourcePath:string;startLine:number;endLine:number}>;
export type ErrorRecipe=TutorSourceAccess & Readonly<{id:string;errorPattern:string;symptom?:string;cause:string;fixSteps:readonly string[];verifyCommand?:string;sourcePath:string}>;
export type FaqRecord=TutorSourceAccess & Readonly<{id:string;question:string;answer:string;sourcePath:string}>;

function access(item:TutorSourceAccess):TutorSourceAccess {
  return {visibility:item.visibility,allowedUsers:item.allowedUsers};
}

export function retrieveCourse(query:string, docs:readonly CourseDoc[], route:'course'|'learning_path', limit=5):TutorCandidate[] {
  const qt=tokens(query);
  const scored=docs.map(doc=>{
    const hay=`${doc.title} ${doc.text} ${(doc.tags??[]).join(' ')}`.toLowerCase();
    const hits=qt.filter(t=>hay.includes(t)).length;
    let score=qt.length && hits ? Math.min(1,0.35+hits/qt.length) : 0;
    if (route==='learning_path' && LEARNING_TERMS.some(t=>hay.includes(t))) score=Math.max(score,0.72);
    return {doc,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
  return scored.map(({doc,score})=>({id:doc.id,text:doc.text,sourcePath:doc.sourcePath,sourceType:'course_note',score:Number(score.toFixed(4)),title:doc.title,metadata:{tags:doc.tags??[]},...access(doc)}));
}

export function retrieveCode(query:string, symbols:readonly CodeSymbol[], limit=5):TutorCandidate[] {
  const q=query.toLowerCase();
  const qt=q.replace(/[?？]/g,' ').split(/\s+/).filter(Boolean);
  return symbols.map(symbol=>{
    const hay=`${symbol.symbolName} ${symbol.sourcePath} ${symbol.text}`.toLowerCase();
    let score=0;
    if(q.includes(symbol.symbolName.toLowerCase())) score+=2;
    if(qt.some(t=>hay.includes(t))) score+=0.5;
    return {symbol,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(({symbol,score})=>({
    id:symbol.id,text:symbol.text,sourcePath:symbol.sourcePath,sourceType:'project_code',score,
    symbolName:symbol.symbolName,startLine:symbol.startLine,endLine:symbol.endLine,
    metadata:{symbolType:symbol.symbolType},...access(symbol)
  }));
}

export function retrieveError(query:string, recipes:readonly ErrorRecipe[]):TutorCandidate[] {
  const q=query.toLowerCase();
  const item=recipes.find(r=>r.errorPattern && q.includes(r.errorPattern.toLowerCase()));
  if(!item) return [];
  return [{
    id:item.id,
    text:[item.errorPattern,item.symptom??'',item.cause,item.fixSteps.join(' '),item.verifyCommand??''].join(' '),
    sourcePath:item.sourcePath,sourceType:'error_recipe',score:1,
    metadata:{cause:item.cause,fixSteps:item.fixSteps,verifyCommand:item.verifyCommand??''},...access(item)
  }];
}

function similarity(a:string,b:string):number {
  const x=a.trim().toLowerCase(), y=b.trim().toLowerCase();
  if(!x||!y) return 0;
  if(x.includes(y)||y.includes(x)) return 1;
  const ax=new Set(tokens(x)), by=new Set(tokens(y));
  const intersection=[...ax].filter(t=>by.has(t)).length;
  return intersection / Math.max(1,new Set([...ax,...by]).size);
}

export function retrieveFaq(query:string, faqs:readonly FaqRecord[], threshold=0.58):TutorCandidate[] {
  const best=faqs.map(f=>({f,score:similarity(query,f.question)})).sort((a,b)=>b.score-a.score)[0];
  if(!best || best.score<threshold) return [];
  return [{id:best.f.id,text:best.f.answer,sourcePath:best.f.sourcePath,sourceType:'faq',score:best.score,title:best.f.question,...access(best.f)}];
}
