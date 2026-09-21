import type { TutorCandidate } from '../../contracts/tutor-runtime';

export type BlockedTutorEvidence=Readonly<{
  candidateId:string;
  sourcePath:string;
  reason:'missing_source'|'access_denied'|'prompt_injection';
}>;

const INJECTION_PATTERNS=[
  /ignore (all |the )?(previous|prior) instructions/i,
  /disregard (all |the )?(previous|prior) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /system prompt/i,
  /developer message/i,
  /override .*instructions/i,
  /jailbreak/i,
  /忽略.*(之前|以上).*指令/,
  /(系统|开发者).*提示词/,
];

export function hasTutorPromptInjection(text:string):boolean {
  return INJECTION_PATTERNS.some(pattern=>pattern.test(text));
}

function canAccess(candidate:TutorCandidate,userId?:string):boolean {
  const visibility=String(candidate.metadata?.visibility??'public');
  if(visibility==='public') return true;
  if(!userId) return false;
  const allowed=Array.isArray(candidate.metadata?.allowedUsers)
    ? candidate.metadata?.allowedUsers.filter((value):value is string=>typeof value==='string')
    : [];
  return allowed.includes(userId);
}

export function filterTutorEvidence(
  candidates:readonly TutorCandidate[],
  userId?:string,
):{allowed:TutorCandidate[];blocked:BlockedTutorEvidence[]} {
  const allowed:TutorCandidate[]=[];
  const blocked:BlockedTutorEvidence[]=[];
  for(const candidate of candidates){
    if(!candidate.sourcePath.trim()){
      blocked.push({candidateId:candidate.id,sourcePath:candidate.sourcePath,reason:'missing_source'});
      continue;
    }
    if(!canAccess(candidate,userId)){
      blocked.push({candidateId:candidate.id,sourcePath:candidate.sourcePath,reason:'access_denied'});
      continue;
    }
    if(hasTutorPromptInjection(candidate.text)){
      blocked.push({candidateId:candidate.id,sourcePath:candidate.sourcePath,reason:'prompt_injection'});
      continue;
    }
    allowed.push(candidate);
  }
  return {allowed,blocked};
}
