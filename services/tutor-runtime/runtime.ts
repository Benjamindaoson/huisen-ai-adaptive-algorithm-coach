import { EVIDENCE_EVENT_CONTRACT_VERSION, type EvidenceEvent } from '../../contracts/evidence-event';
import type { TutorAction, TutorCandidate, TutorRequest, TutorResponse } from '../../contracts/tutor-runtime';
import type { EvidenceStore } from '../../packages/evidence/evidence-store';
import { citationsFrom, gateTutorEvidence } from './evidence-gate';
import { routeTutorQuery } from './intent-router';
import { retrieveCode, retrieveCourse, retrieveError, retrieveFaq, type CodeSymbol, type CourseDoc, type ErrorRecipe, type FaqRecord } from './retrievers';
import { filterTutorEvidence } from './safety';

export type TutorRuntimeCorpus=Readonly<{
  courseDocs?:readonly CourseDoc[];
  codeSymbols?:readonly CodeSymbol[];
  errorRecipes?:readonly ErrorRecipe[];
  faqs?:readonly FaqRecord[];
}>;

export type TutorRuntimeRequest=TutorRequest & Readonly<{userId?:string}>;

export class TutorRuntime {
  constructor(
    readonly corpus:TutorRuntimeCorpus,
    readonly evidence:EvidenceStore,
  ) {}

  run(request:TutorRuntimeRequest):TutorResponse {
    const traceId=`tutor:${request.sessionId??'session'}:${Date.now()}:${Math.random().toString(36).slice(2,8)}`;
    const route=routeTutorQuery(request.query);
    this.record(request,traceId,'tool_trace','route',0,{route:route.route,reason:route.reason,confidence:route.confidence});

    if(route.needsClarification){
      const action: TutorAction='clarify';
      this.record(request,traceId,'learning_event','intervention',1,{action,reason:route.reason});
      return {
        route:route.route,
        action,
        answer:'Please add the course topic, code file, full error, or concept you want explained.',
        citations:[],
        needsClarification:true,
        evidenceDecision:'clarify_or_refuse',
        traceId
      };
    }

    const rawCandidates=this.retrieve(request.query,route.route);
    const {allowed,blocked}=filterTutorEvidence(rawCandidates,request.userId);

    this.record(request,traceId,'retrieval_trace','retrieval',1,{
      route:route.route,
      candidateCount:rawCandidates.length,
      allowedCount:allowed.length,
      blockedReasons:blocked.map(item=>item.reason),
      sources:allowed.map(c=>c.sourcePath)
    });

    const gate=gateTutorEvidence(allowed);
    const gateReason=blocked.length>0 && allowed.length===0 ? blocked[0].reason : gate.reason;
    this.record(request,traceId,'tool_trace','evidence_gate',2,{
      action:gate.action,
      reason:gateReason,
      confidence:gate.confidence,
      blockedCount:blocked.length
    });

    const citations=citationsFrom(allowed);
    if(gate.action!=='accept'){
      const action: TutorAction='refuse';
      this.record(request,traceId,'learning_event','intervention',3,{action,reason:gateReason});
      return {
        route:route.route,
        action,
        answer:'I do not have enough safe, cited evidence to answer this reliably. Add an approved course source, code file, full error, or runtime context.',
        citations,
        needsClarification:true,
        evidenceDecision:'clarify_or_refuse',
        traceId
      };
    }

    const action=this.actionFor(route.route);
    const answer=this.groundedAnswer(route.route,allowed);
    this.record(request,traceId,'learning_event','intervention',3,{
      action,
      citationCount:citations.length,
      sourceTypes:[...new Set(citations.map(c=>c.sourceType))]
    });
    return {
      route:route.route,
      action,
      answer,
      citations,
      needsClarification:false,
      evidenceDecision:'accept',
      traceId
    };
  }

  private retrieve(query:string,route:string):TutorCandidate[] {
    if(route==='code') return retrieveCode(query,this.corpus.codeSymbols??[]);
    if(route==='error') return retrieveError(query,this.corpus.errorRecipes??[]);
    if(route==='faq') return retrieveFaq(query,this.corpus.faqs??[]);
    if(route==='course'||route==='learning_path') return retrieveCourse(query,this.corpus.courseDocs??[],route);
    return [];
  }

  private actionFor(route:string):TutorAction {
    if(route==='code') return 'point_to_code';
    if(route==='error') return 'diagnose_error';
    return 'explain';
  }

  private groundedAnswer(route:string,candidates:readonly TutorCandidate[]):string {
    const first=candidates[0];
    if(route==='code' && first) return `${first.symbolName??'Symbol'} is in ${first.sourcePath}:${first.startLine??'?'}.`;
    if(route==='faq' && first) return first.text;
    if(route==='error' && first){
      const cause=String(first.metadata?.cause??'');
      const steps=Array.isArray(first.metadata?.fixSteps)
        ? first.metadata?.fixSteps.filter((value):value is string=>typeof value==='string').join('; ')
        : '';
      return `Likely cause: ${cause}. Fix: ${steps}`;
    }
    return 'Based on the cited learning evidence:\n'+candidates.slice(0,3).map(c=>`- ${c.title??c.sourcePath}: ${c.text.replace(/\s+/g,' ').slice(0,420)}`).join('\n');
  }

  private record(
    request:TutorRuntimeRequest,
    traceId:string,
    evidenceType:EvidenceEvent['evidenceType'],
    phase:string,
    ordinal:number,
    metadata:Record<string,unknown>,
  ):void {
    this.evidence.append({
      contractVersion:EVIDENCE_EVENT_CONTRACT_VERSION,
      id:`${traceId}:${phase}`,
      learnerId:request.learnerId,
      skillId:request.skillId,
      taskId:request.taskId,
      sessionId:request.sessionId,
      domain:request.skillId.startsWith('rag.')?'rag':request.skillId.startsWith('agent.')?'agent':request.skillId.startsWith('llm.')?'llm':'legacy',
      activityType:'learn',
      evidenceType,
      traceRef:traceId,
      result:phase,
      provenance:{source:'tutor-runtime',sourceId:traceId,adapter:'TutorRuntime'},
      metadata,
      createdAt:new Date(Date.now()+ordinal).toISOString(),
    });
  }
}
