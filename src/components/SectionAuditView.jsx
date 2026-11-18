import { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

function GradeLabel({ grade }) {
  if (grade === 'Strong') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Strong</span>
      </span>
    );
  }
  if (grade === 'Fair') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Fair</span>
      </span>
    );
  }
  if (grade === 'Needs Work') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Needs Work</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5" />
      <span>Missing</span>
    </span>
  );
}

export function SectionAuditView({ sections, extractedResumeText }) {
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedResumeText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Section Structure &amp; ATS Parseability
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Structural audit of every core resume section alongside the raw text extracted during parsing.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6 whitespace-nowrap">Section</th>
                <th className="py-3 px-4 whitespace-nowrap">Presence</th>
                <th className="py-3 px-4 whitespace-nowrap">Assessment</th>
                <th className="py-3 px-6">Diagnostic Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {sections.map((item) => (
                <tr key={item.section} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-6 font-medium text-slate-900 whitespace-nowrap">
                    {item.section}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {item.present ? 'Detected' : 'Not Found'}
                  </td>
                  <td className="py-3.5 px-4">
                    <GradeLabel grade={item.grade} />
                  </td>
                  <td className="py-3.5 px-6 text-slate-600 leading-relaxed">
                    {item.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Extracted Plain-Text Transcript
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify that dates, headings, and bullet lines read cleanly in plain text order.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedText ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Transcript</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-6 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/40 max-h-[420px] overflow-y-auto">
          {extractedResumeText || 'No plain-text transcript available.'}
        </pre>
      </section>
    </div>
  );
}
