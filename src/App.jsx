import { useEffect, useState } from 'react';
import {
  FilePlus2,
  BarChart3,
  PenLine,
  Layers,
  Mail,
  Trash2,
  Copy,
  Check,
  Printer,
  Menu,
  X,
} from 'lucide-react';
import { AnalysisInputView } from './components/AnalysisInputView';
import { ScorecardOverview } from './components/ScorecardOverview';
import { BulletRewritesView } from './components/BulletRewritesView';
import { SectionAuditView } from './components/SectionAuditView';
import { OutreachDraftView } from './components/OutreachDraftView';
import { buildMarkdownReport } from './utils/exportMarkdown';

const STORAGE_KEY = 'resumelens_history_v1';

function loadSavedHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [history, setHistory] = useState(() => loadSavedHistory());
  const [activeRecordId, setActiveRecordId] = useState(() => {
    const initial = loadSavedHistory();
    return initial.length > 0 ? initial[0].id : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const initial = loadSavedHistory();
    return initial.length > 0 ? 'scorecard' : 'new';
  });

  const [resumeText, setResumeText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  const activeRecord =
    history.find((item) => item.id === activeRecordId) || null;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const payload = {
        resumeText: selectedFile ? undefined : resumeText,
        fileData: selectedFile
          ? {
              base64: selectedFile.base64,
              mimeType: selectedFile.mimeType,
              fileName: selectedFile.fileName,
            }
          : undefined,
        targetRole,
        jobDescription,
      };

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Resume analysis failed.');
      }

      const newRecord = {
        id: `audit-${Date.now()}`,
        createdAt: new Date().toISOString(),
        fileName: selectedFile ? selectedFile.fileName : 'Pasted Resume',
        targetRole: data.targetRole || targetRole || 'General Audit',
        jobDescription,
        analysis: data,
        completedActionIds: [],
      };

      setHistory((prev) => [newRecord, ...prev].slice(0, 12));
      setActiveRecordId(newRecord.id);
      setActiveTab('scorecard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during analysis.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleChecklistAction = (actionId) => {
    if (!activeRecord) return;
    setHistory((prev) =>
      prev.map((rec) => {
        if (rec.id !== activeRecord.id) return rec;
        const exists = rec.completedActionIds.includes(actionId);
        return {
          ...rec,
          completedActionIds: exists
            ? rec.completedActionIds.filter((id) => id !== actionId)
            : [...rec.completedActionIds, actionId],
        };
      })
    );
  };

  const handleDeleteRecord = (id) => {
    setHistory((prev) => {
      const remaining = prev.filter((item) => item.id !== id);
      if (activeRecordId === id) {
        if (remaining.length > 0) {
          setActiveRecordId(remaining[0].id);
        } else {
          setActiveRecordId(null);
          setActiveTab('new');
        }
      }
      return remaining;
    });
  };

  const handleCopyMarkdown = async () => {
    if (!activeRecord) return;
    const md = buildMarkdownReport(activeRecord.analysis);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleStartNewAudit = () => {
    setError(null);
    setActiveTab('new');
    setMobileMenuOpen(false);
  };

  const selectAnalysisTab = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'scorecard', label: 'Scorecard & Gaps', icon: BarChart3 },
    { id: 'rewrites', label: 'Bullet Rewrites', icon: PenLine },
    { id: 'sections', label: 'Section Audit', icon: Layers },
    { id: 'outreach', label: 'Outreach Draft', icon: Mail },
  ];

  const breadcrumbLabel =
    activeTab === 'new' || !activeRecord
      ? 'Workspace / New Resume Audit'
      : `Workspace / ${activeRecord.analysis.candidateSummary.name} / ${activeRecord.targetRole}`;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[264px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleStartNewAudit}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            ResumeLens
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={handleStartNewAudit}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'new'
                ? 'bg-slate-900 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <FilePlus2 className="w-4 h-4 shrink-0" />
            <span>New Analysis</span>
          </button>

          {activeRecord && (
            <nav aria-label="Analysis views" className="space-y-1">
              <p className="px-2.5 pb-1.5 text-xs font-medium text-slate-500">
                Current Report
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectAnalysisTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          <div className="space-y-1.5">
            <p className="px-2.5 pb-1 text-xs font-medium text-slate-500">
              Recent Audits
            </p>
            {history.length === 0 ? (
              <p className="px-2.5 text-xs text-slate-400">
                Completed resume analyses appear here for comparison.
              </p>
            ) : (
              <div className="space-y-1">
                {history.map((record) => {
                  const selected =
                    activeRecord?.id === record.id && activeTab !== 'new';
                  return (
                    <div
                      key={record.id}
                      className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                        selected
                          ? 'bg-blue-50/70 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRecordId(record.id);
                          setActiveTab('scorecard');
                          setMobileMenuOpen(false);
                        }}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <p className="text-xs font-semibold truncate">
                          {record.analysis.candidateSummary.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {record.targetRole}
                        </p>
                      </button>

                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-700 shrink-0">
                        {record.analysis.overallScore}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        aria-label={`Delete audit for ${record.analysis.candidateSummary.name}`}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 px-4 sm:px-8 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-sm text-slate-600 truncate">{breadcrumbLabel}</p>
          </div>

          {activeRecord && activeTab !== 'new' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedMarkdown ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Report</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print PDF</span>
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'new' || !activeRecord ? (
              <AnalysisInputView
                resumeText={resumeText}
                onResumeTextChange={setResumeText}
                selectedFile={selectedFile}
                onSelectedFileChange={setSelectedFile}
                targetRole={targetRole}
                onTargetRoleChange={setTargetRole}
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                error={error}
                onClearError={() => setError(null)}
              />
            ) : activeTab === 'scorecard' ? (
              <ScorecardOverview
                analysis={activeRecord.analysis}
                completedActionIds={activeRecord.completedActionIds}
                onToggleAction={handleToggleChecklistAction}
              />
            ) : activeTab === 'rewrites' ? (
              <BulletRewritesView
                rewrites={activeRecord.analysis.bulletRewrites}
                targetRole={activeRecord.targetRole}
                jobDescription={activeRecord.jobDescription}
              />
            ) : activeTab === 'sections' ? (
              <SectionAuditView
                sections={activeRecord.analysis.sectionAudit}
                extractedResumeText={
                  activeRecord.analysis.extractedResumeText
                }
              />
            ) : (
              <OutreachDraftView
                resumeText={activeRecord.analysis.extractedResumeText}
                targetRole={activeRecord.targetRole}
                jobDescription={activeRecord.jobDescription}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
