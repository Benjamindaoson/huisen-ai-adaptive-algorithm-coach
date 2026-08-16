export type EducationDataClassification = 'public' | 'simulated' | 'authorized-desensitized' | 'learner-created';
export type DataCategory = {
  id: string;
  title: string;
  classification: EducationDataClassification;
  purpose: string;
  storage: string;
  retention: string;
  affectsMastery: boolean;
};

export const FORMATIVE_EVALUATION_NOTICE = 'AI 反馈仅用于形成性学习指导，不替代教师、学校、企业或专业机构的最终评价。';

export const EDUCATION_TRUST_MANIFEST = {
  version: '2026.08.13',
  dataCategories: [
    { id: 'public-curriculum', title: '公开学习内容', classification: 'public', purpose: '构建课程、知识图谱与练习上下文', storage: '版本化内容库', retention: '随内容版本保留来源记录', affectsMastery: false },
    { id: 'demo-practicum', title: '模拟项目实训', classification: 'simulated', purpose: '稳定复现真实工程流程，不冒充企业生产仓库', storage: 'Web App 静态项目快照', retention: '随应用版本更新', affectsMastery: false },
    { id: 'teacher-quality', title: '授权脱敏评测样本', classification: 'authorized-desensitized', purpose: '评估导师定位、错因和最小提示质量', storage: '受角色保护的质量库', retention: '按评测授权与审计策略保留', affectsMastery: false },
    { id: 'learner-work', title: '学习者代码与学习事件', classification: 'learner-created', purpose: '保存草稿、恢复进度并生成可解释学习计划', storage: '未登录时本机；登录后 PostgreSQL 权威保存', retention: '可导出并申请删除', affectsMastery: true },
    { id: 'mentor-guidance', title: 'AI Mentor 建议', classification: 'simulated', purpose: '提供过程问题、诊断假设与最小提示', storage: '绑定提交快照的 Mentor 运行记录', retention: '随学习记录导出或删除', affectsMastery: false },
  ] satisfies DataCategory[],
} as const;

type ControlStatus = 'available' | 'sign-in-required' | 'unavailable';

export function buildTrustCenterState(input: {
  authenticated: boolean;
  apiConfigured: boolean;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
}) {
  const serverAvailable = input.authenticated && input.apiConfigured && input.syncStatus !== 'error';
  return {
    storageMode: input.authenticated ? (input.syncStatus === 'synced' ? 'server-authoritative' : 'server-pending') : 'browser-local',
    controls: {
      localExport: 'available' as ControlStatus,
      cloudExport: !input.authenticated ? 'sign-in-required' as ControlStatus : serverAvailable ? 'available' as ControlStatus : 'unavailable' as ControlStatus,
      deletion: !input.authenticated ? 'sign-in-required' as ControlStatus : serverAvailable ? 'available' as ControlStatus : 'unavailable' as ControlStatus,
    },
  };
}
