import { useState } from 'react';
import {
  Copy,
  Check,
  Wand2,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const TONES = [
  'Quantified Impact',
  'Concise Executive',
  'ATS Keyword-Rich',
];

export function BulletRewritesView({
  rewrites,
  targetRole,
  jobDescription,
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [customBullet, setCustomBullet] = useState('');
  const [selectedTone, setSelectedTone] = useState('Quantified Impact');
  const [customResult, setCustomResult] = useState(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState(null);

  const handleCopy = async (id, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleRewriteCustom = async (e) => {
    e.preventDefault();
    if (customBullet.trim().length < 8) return;
    setIsRewriting(true);
    setRewriteError(null);

    try {
      const res = await fetch('/api/rewrite-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet: customBullet,
          tone: selectedTone,
          targetRole,
          jobDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rewrite bullet point.');
      }
      setCustomResult(data);
    } catch (err) {
      setRewriteError(
        err instanceof Error ? err.message : 'Unable to rewrite bullet point.'
      );
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Bullet Point Rewrites
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Weak or passive resume bullets identified during the audit, paired with concrete, outcome-focused rewrites. Bracketed placeholders like{' '}
          <span className="font-mono text-xs text-slate-800">[X%]</span> mark spots to insert your real metrics.
        </p>
      </div>

      <div className="space-y-4">
        {rewrites.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
            No weak bullet points flagged for this resume.
          </div>
        ) : (
          rewrites.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <article
                key={item.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {item.section}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.issue}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.id, item.improved)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Rewrite</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                  <div className="p-5">
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Original Bullet
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {item.original}
                    </p>
                  </div>
                  <div className="p-5 bg-emerald-50/20">
                    <p className="text-xs font-medium text-emerald-700 mb-2">
                      Suggested Rewrite
                    </p>
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                      {item.improved}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Custom Bullet Lab
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Test and refine any other line from your resume for {targetRole || 'your target role'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setSelectedTone(tone)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedTone === tone
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tone}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleRewriteCustom} className="space-y-3">
          <textarea
            value={customBullet}
            onChange={(e) => setCustomBullet(e.target.value)}
            rows={3}
            placeholder="Paste a bullet point (e.g., Worked on backend APIs and helped deploy services to AWS)..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none"
          />

          {rewriteError && (
            <div className="flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{rewriteError}</span>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={isRewriting || customBullet.trim().length < 8}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap cursor-pointer disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isRewriting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rewriting...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Rewrites</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {customResult && (
          <div className="pt-4 border-t border-slate-200 space-y-4">
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">Diagnosis: </span>
              {customResult.diagnosis}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customResult.alternatives.map((alt, index) => {
                const key = `custom-${index}`;
                const copied = copiedId === key;
                return (
                  <div
                    key={key}
                    className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-medium text-blue-700 mb-1.5">
                        {alt.label}
                      </p>
                      <p className="text-sm text-slate-900 leading-relaxed">
                        {alt.text}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(key, alt.text)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
