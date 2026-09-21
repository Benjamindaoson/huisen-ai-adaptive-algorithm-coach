import type { TutorAction, TutorRoute } from '../../contracts/tutor-runtime';
import type { TutorRuntime } from './runtime';

export type TutorEvaluationCase=Readonly<{
  id:string;
  learnerId:string;
  skillId:string;
  query:string;
  expectedRoute:TutorRoute;
  expectedAction?:TutorAction;
  requireCitation?:boolean;
  shouldRefuse?:boolean;
}>;

export type TutorEvaluationReport=Readonly<{
  total:number;
  routeAccuracy:number;
  actionAccuracy:number;
  citationCoverage:number;
  refusalAccuracy:number;
}>;

function ratio(hit:number,total:number):number {
  return total===0 ? 1 : hit/total;
}

export function evaluateTutorRuntime(
  runtime:TutorRuntime,
  cases:readonly TutorEvaluationCase[],
):TutorEvaluationReport {
  let routeHits=0;
  let actionHits=0;
  let actionChecks=0;
  let citationHits=0;
  let citationChecks=0;
  let refusalHits=0;
  let refusalChecks=0;

  for(const item of cases){
    const result=runtime.run({
      learnerId:item.learnerId,
      skillId:item.skillId,
      sessionId:`eval:${item.id}`,
      query:item.query,
    });

    if(result.route===item.expectedRoute) routeHits++;

    if(item.expectedAction){
      actionChecks++;
      if(result.action===item.expectedAction) actionHits++;
    }

    if(item.requireCitation!==undefined){
      citationChecks++;
      const hasCitation=result.citations.length>0;
      if(hasCitation===item.requireCitation) citationHits++;
    }

    if(item.shouldRefuse!==undefined){
      refusalChecks++;
      const refused=result.action==='refuse'||result.action==='clarify';
      if(refused===item.shouldRefuse) refusalHits++;
    }
  }

  return {
    total:cases.length,
    routeAccuracy:ratio(routeHits,cases.length),
    actionAccuracy:ratio(actionHits,actionChecks),
    citationCoverage:ratio(citationHits,citationChecks),
    refusalAccuracy:ratio(refusalHits,refusalChecks),
  };
}
