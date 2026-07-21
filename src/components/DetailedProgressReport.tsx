import { buildProgressReportData, type LearningTelemetry, type ProgressCategory } from '../lib/learningNarrative'

function DomainRow({ domain }: { domain: ProgressCategory }) {
  const practiced = domain.total > 0
  return <li className="report-domain-row">
    <div><b>{domain.name}</b><small>{practiced ? `${domain.correct}/${domain.total}` : 'Not yet practiced'}</small></div>
    <div className="report-domain-score"><span>{practiced ? `${domain.accuracy}%` : '—'}</span>{practiced && <progress value={domain.accuracy} max="100" aria-label={`${domain.name} accuracy: ${domain.accuracy}%`} />}</div>
  </li>
}

function DomainGroup({ title, domains }: { title: string; domains: ProgressCategory[] }) {
  return <section className="report-domain-group"><h3>{title}</h3>{domains.length ? <ul>{domains.map((domain) => <DomainRow domain={domain} key={domain.name} />)}</ul> : <p className="report-empty">No practice in this area yet.</p>}</section>
}

export function DetailedProgressReport({ telemetry }: { telemetry: LearningTelemetry }) {
  const report = buildProgressReportData(telemetry)
  if (!report.hasData) {
    return <section className="card detailed-progress-report"><details open><summary><i className="card-emoji" aria-hidden="true">📊</i><span>Detailed progress report</span><i className="report-chevron" aria-hidden="true">⌄</i></summary><div className="report-empty-state"><h2>Ready for the first win?</h2><p>{report.name}'s first practice session will unlock a personalized progress report, skill breakdown, and next-step plan here.</p><p><b>Recommended focus:</b> Complete a 5-question Daily Quest.</p></div></details></section>
  }

  const growth = report.growthDomain!
  return <section className="card detailed-progress-report"><details open>
    <summary><i className="card-emoji" aria-hidden="true">📊</i><span>Detailed progress report</span><i className="report-chevron" aria-hidden="true">⌄</i></summary>
    <div className="report-content">
      <div className="report-stat-tiles mastery-totals">
        <span><small>Questions this week</small><b>{report.totalQuestions}</b></span>
        <span><small>Current streak</small><b><i className="inline-list-icon" aria-hidden="true">🔥</i>{report.currentStreak} days</b></span>
        <span><small>Top mastery</small><b>{report.topDomain!.name}</b><em>{report.topDomain!.accuracy}% accuracy</em></span>
      </div>
      <p className="report-intro">{report.name} is building SAT skills through consistent, targeted practice. Here is the clearest picture of the next step.</p>
      <div className="report-domain-groups"><DomainGroup title="Math" domains={report.mathDomains} /><DomainGroup title="Reading & Writing" domains={report.readingDomains} /></div>
      <section className="report-growth-focus"><i className="card-emoji" aria-hidden="true">🎯</i><div><span className="eyebrow">Growth focus</span><h2>{growth.name}</h2><p>{growth.total ? `${growth.correct}/${growth.total} correct · ${growth.accuracy}% accuracy` : 'Not yet practiced'} — a focused 5-question set is the best next move.</p></div></section>
      <section className="report-action-plan"><h2>Action plan for the next session</h2><ol><li><b>Focused practice set.</b> Start with 5 questions in {growth.name} while focus is fresh.</li><li><b>Strategy shift.</b> {report.strategy}</li><li><b>Parent conversation starter.</b> <blockquote>{report.conversationStarter}</blockquote></li></ol></section>
    </div>
  </details></section>
}
