import { useState } from 'react';
import {
  Send,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const FORMATS = [
  'Cover Letter',
  'Recruiter Email',
  'LinkedIn Note',
];

export function OutreachDraftView({
  resumeText,
  targetRole,
  jobDescription,
}) {
  const [format, setFormat] = useState('Cover Letter');
  const [draft, setDraft] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          resumeText,
          targetRole,
          jobDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate outreach draft.');
      }
      setDraft(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to generate outreach draft.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    const text = draft.subjectLine
      ? `Subject: ${draft.subjectLine}\n\n${draft.body}`
      : draft.body;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const wordCount = draft?.body?.trim()
    ? draft.body.trim().split(/\s+/).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Tailored Outreach Draft
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate a role-specific cover letter or recruiter message grounded strictly in your analyzed resume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            {FORMATS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFormat(item)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  format === item
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Drafting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{draft ? 'Regenerate' : 'Generate Draft'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {draft ? (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              {format} · {wordCount} words
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Draft</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="draft-subject"
                className="block text-xs font-medium text-slate-500 mb-1"
              >
                Subject / Header
              </label>
              <input
                id="draft-subject"
                type="text"
                value={draft.subjectLine}
                onChange={(e) =>
                  setDraft({ ...draft, subjectLine: e.target.value })
                }
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="draft-body"
                className="block text-xs font-medium text-slate-500 mb-1"
              >
                Message Body (editable)
              </label>
              <textarea
                id="draft-body"
                rows={12}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-4 text-sm text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <p className="text-sm font-medium text-slate-900">
            Ready to draft a {format.toLowerCase()} for {targetRole || 'your target role'}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Select your preferred outreach format above and click Generate Draft to synthesize your top resume achievements into a concise, human pitch.
          </p>
        </section>
      )}
    </div>
  );
}
