import type {
  MeetingEditorDraftPrefill,
  MeetingEditorPrefillAgendaRow,
} from '../meetings/meetingEditorPrefill';
import { isCrfSgmSuggested, parseEstimatedBudget } from './authorizationType';

export type ProcurementJobSgmContext = {
  id: string;
  title_en: string;
  title_zh?: string | null;
  estimated_budget: number | null | undefined;
  authorization_type?: string | null;
};

export function canShowProcurementSgmDraftButton(
  job: ProcurementJobSgmContext,
  crfBalance: number | null | undefined,
): boolean {
  if (job.authorization_type !== 'major_unplanned') return false;
  if (crfBalance == null || !Number.isFinite(Number(crfBalance)) || Number(crfBalance) <= 0) {
    return false;
  }
  return isCrfSgmSuggested(job.estimated_budget, crfBalance);
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function crfPercent(estimatedBudget: number, crfBalance: number): string {
  if (crfBalance <= 0) return '—';
  return `${((estimatedBudget / crfBalance) * 100).toFixed(1)}%`;
}

function buildProcurementSgmAgendaItem(
  job: ProcurementJobSgmContext,
  budget: number,
  crfBalance: number,
): MeetingEditorPrefillAgendaRow {
  const titleZh = job.title_zh?.trim() || job.title_en?.trim() || '—';
  const titleEn = job.title_en?.trim() || job.title_zh?.trim() || '—';
  const pct = crfPercent(budget, crfBalance);
  const budgetFmt = formatMoney(budget);

  const description_zh = [
    '业委会建议授权以下计划外支出：',
    '',
    '项目名称：',
    titleZh,
    '预计金额：',
    budgetFmt,
    '该金额约占当前储备基金（CRF）的：',
    `${pct}%`,
    '根据 ClearStrata 治理规则，',
    '当计划外支出达到或超过 CRF 的 10% 时，',
    '建议提交业主大会审议。',
    '',
    '---',
    '',
    '决议：',
    '业主授权业委会推进上述计划外支出，',
    `授权金额上限为 ${budgetFmt}。`,
    '业委会应保留采购授权记录、',
    '供应商报价、',
    '相关支持文件，',
    '并在支出完成后纳入发票审核流程。',
  ].join('\n');

  const description_en = [
    'Council recommends approval of the following unplanned expenditure:',
    '',
    'Project:',
    titleEn,
    'Estimated amount:',
    budgetFmt,
    'This expenditure represents approximately',
    `${pct}%`,
    'of the current Contingency Reserve Fund.',
    'According to ClearStrata governance guidelines,',
    'unplanned expenditures reaching or exceeding 10% of the CRF should be considered by the owners.',
    '',
    '---',
    '',
    'BE IT RESOLVED THAT:',
    'The owners authorize the council to proceed with the proposed unplanned expenditure,',
    `up to a maximum amount of ${budgetFmt}.`,
    'Council shall retain procurement authorization records,',
    'vendor quotations,',
    'and supporting documents,',
    'and ensure the expenditure enters the invoice review process upon completion.',
  ].join('\n');

  return {
    title_zh: '授权计划外支出',
    title_en: 'Authorization of Unplanned Expenditure',
    kind: 'resolution',
    vote_rule: 'simple_majority',
    description_zh,
    description_en,
  };
}

export function buildProcurementSgmMeetingPrefill(
  job: ProcurementJobSgmContext,
  crfBalance: number,
  _languageEn: boolean,
): MeetingEditorDraftPrefill {
  const budget = parseEstimatedBudget(job.estimated_budget);
  const jobTitleZh = job.title_zh?.trim() || job.title_en?.trim() || '—';
  const jobTitleEn = job.title_en?.trim() || job.title_zh?.trim() || '—';
  const pct = crfPercent(budget, crfBalance);

  const description_zh = [
    '本特别业主大会草案由采购授权模块生成，供业委会编辑后保存为草稿。',
    '',
    `采购授权项目：${jobTitleZh}`,
    `预计授权金额：${formatMoney(budget)}`,
    `当前 CRF 余额：${formatMoney(crfBalance)}`,
    `占 CRF 比例：${pct}`,
    '原因：该计划外支出达到或超过 CRF 10%，建议由业主授权。',
    '',
    'Associated Procurement Authorization:',
    job.id,
  ].join('\n');

  const description_en = [
    'This SGM draft was prefilled from Procurement Authorization for council editing before save.',
    '',
    `Procurement authorization: ${jobTitleEn}`,
    `Estimated authorization amount: ${formatMoney(budget)}`,
    `Current CRF balance: ${formatMoney(crfBalance)}`,
    `Share of CRF: ${pct}`,
    'Reason: This unplanned expense reaches or exceeds 10% of the CRF balance; owner authorization is recommended.',
    '',
    'Associated Procurement Authorization:',
    job.id,
  ].join('\n');

  return {
    source: 'procurement_sgm',
    meeting_type: 'sgm',
    initiation_type: 'council_initiated',
    title_zh: '特别业主大会：授权计划外支出',
    title_en: 'Special General Meeting: Authorization of Unplanned Expense',
    description_zh,
    description_en,
    procurement_job_id: job.id,
    agenda_items: [buildProcurementSgmAgendaItem(job, budget, crfBalance)],
  };
}
