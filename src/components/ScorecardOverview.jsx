import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  Search,
} from 'lucide-react';

function getScoreStrokeColor(score) {
  if (score >= 80) return '#16A34A';
  if (score >= 60) return '#D97706';
  return '#DC2626';
}

function VerdictIndicator({ verdict }) {
  if (verdict === 'Strong Match') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="w-4 h-4" />
        <span>Strong Match</span>
      </span>
    );
  }
  if (verdict === 'Competitive') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
        <CheckCircle2 className="w-4 h-4" />
        <span>Competitive</span>
      </span>
    );
  }
  if (verdict === 'Needs Refinement') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700">
        <AlertTriangle className="w-4 h-4" />
        <span>Needs Refinement</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-700">
      <XCircle className="w-4 h-4" />
      <span>Major Gaps</span>
    </span>
  );
}

function StatusLabel({ status }) {
  if (status === 'strong') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Strong</span>
      </span>
    );
  }
  if (status === 'moderate') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Moderate</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5" />
      <span>Needs Work</span>
    </span>
  );
}

export function ScorecardOverview({
  analysis,
  completedActionIds,
  onToggleAction,
}) {
  const [matchedCategory, setMatchedCategory] = useState('All');
  const [missingPriority, setMissingPriority] = useState('All');
  const [keywordSearch, setKeywordSearch] = useState('');

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, analysis.overallScore));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const filteredMatched = useMemo(() => {
    return analysis.matchedKeywords.filter((kw) => {
      const catOk =
        matchedCategory === 'All' || kw.category === matchedCategory;
      const searchOk =
        !keywordSearch.trim() ||
        kw.term.toLowerCase().includes(keywordSearch.toLowerCase()) ||
        kw.evidence.toLowerCase().includes(keywordSearch.toLowerCase());
      return catOk && searchOk;
    });
  }, [analysis.matchedKeywords, matchedCategory, keywordSearch]);

  const filteredMissing = useMemo(() => {
    return analysis.missingKeywords.filter((kw) => {
      const prioOk =
        missingPriority === 'All' || kw.priority === missingPriority;
      const searchOk =
        !keywordSearch.trim() ||
        kw.term.toLowerCase().includes(keywordSearch.toLowerCase()) ||
        kw.suggestion.toLowerCase().includes(keywordSearch.toLowerCase());
      return prioOk && searchOk;
    });
  }, [analysis.missingKeywords, missingPriority, keywordSearch]);

  const completedCount = analysis.priorityChecklist.filter((a) =>
    completedActionIds.includes(a.id)
  ).length;

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-5 shrink-0">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={getScoreStrokeColor(clampedScore)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {clampedScore}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  out of 100
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {analysis.candidateSummary.name || 'Candidate Evaluation'}
              </h1>
              <VerdictIndicator verdict={analysis.verdict} />
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{analysis.candidateSummary.currentRole}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {analysis.candidateSummary.experienceYears}
              </span>
              <span aria-hidden="true">·</span>
              <span>{analysis.candidateSummary.primaryDomain}</span>
              <span aria-hidden="true">·</span>
              <span>Target: {analysis.targetRole}</span>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed pt-1">
              {analysis.executiveSummary}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Evaluation Dimensions
          </h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            5 Core Axes
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {analysis.dimensionScores.map((dim) => {
            const barColor =
              dim.status === 'strong'
                ? 'bg-emerald-600'
                : dim.status === 'moderate'
                  ? 'bg-amber-500'
                  : 'bg-red-600';

            return (
              <div
                key={dim.name}
                className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-center"
              >
                <div className="md:col-span-3">
                  <p className="text-sm font-medium text-slate-900">{dim.name}</p>
                </div>

                <div className="md:col-span-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.max(4, Math.min(100, dim.score))}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 font-mono tabular-nums w-10 text-right">
                    {dim.score}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <StatusLabel status={dim.status} />
                </div>

                <div className="md:col-span-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {dim.rationale}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">
          Keyword &amp; Competency Coverage
        </h2>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={keywordSearch}
            onChange={(e) => setKeywordSearch(e.target.value)}
            placeholder="Filter keywords..."
            aria-label="Filter keywords"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Matched Keywords
              </h3>
              <span className="text-xs font-mono tabular-nums text-emerald-700 font-medium">
                {analysis.matchedKeywords.length} detected
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['All', 'Technical', 'Domain', 'Leadership', 'Tool'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMatchedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    matchedCategory === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[380px] overflow-y-auto">
            {filteredMatched.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">
                No matched keywords match your current filter.
              </p>
            ) : (
              filteredMatched.map((kw, idx) => (
                <div key={`${kw.term}-${idx}`} className="px-5 py-3 hover:bg-slate-50/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 font-mono">
                      {kw.term}
                    </span>
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {kw.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {kw.evidence}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Missing or Underrepresented
              </h3>
              <span className="text-xs font-mono tabular-nums text-amber-700 font-medium">
                {analysis.missingKeywords.length} gaps
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {['All', 'Critical', 'Recommended', 'Bonus'].map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setMissingPriority(prio)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    missingPriority === prio
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[380px] overflow-y-auto">
            {filteredMissing.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">
                No keyword gaps in this filter.
              </p>
            ) : (
              filteredMissing.map((kw, idx) => {
                const prioColor =
                  kw.priority === 'Critical'
                    ? 'text-red-700'
                    : kw.priority === 'Recommended'
                      ? 'text-amber-700'
                      : 'text-slate-600';

                return (
                  <div key={`${kw.term}-${idx}`} className="px-5 py-3 hover:bg-slate-50/70">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 font-mono">
                        {kw.term}
                      </span>
                      <span className={`text-xs font-medium whitespace-nowrap ${prioColor}`}>
                        {kw.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      {kw.suggestion}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Priority Revision Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track high-leverage edits before submitting your next application.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-medium text-slate-700 whitespace-nowrap">
            {completedCount} / {analysis.priorityChecklist.length} completed
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {analysis.priorityChecklist.map((item) => {
            const done = completedActionIds.includes(item.id);
            const impactColor =
              item.impact === 'High'
                ? 'text-red-700'
                : item.impact === 'Medium'
                  ? 'text-amber-700'
                  : 'text-slate-600';

            return (
              <label
                key={item.id}
                className="px-6 py-3.5 flex items-start gap-3.5 hover:bg-slate-50/70 cursor-pointer"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  onClick={() => onToggleAction(item.id)}
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    done
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${
                        done ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {item.action}
                    </span>
                    <span className={`text-xs font-medium whitespace-nowrap ${impactColor}`}>
                      {item.impact} Impact
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.expectedLift}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
