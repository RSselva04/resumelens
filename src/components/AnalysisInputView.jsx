import { useRef, useState } from 'react';
import {
  FileText,
  Upload,
  X,
  ArrowRight,
  AlertCircle,
  Loader2,
  Briefcase,
  FileCheck2,
} from 'lucide-react';
import { SAMPLE_PRESETS } from '../data/samples';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function AnalysisInputView({
  resumeText,
  onResumeTextChange,
  selectedFile,
  onSelectedFileChange,
  targetRole,
  onTargetRoleChange,
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  isAnalyzing,
  error,
  onClearError,
}) {
  const [inputMode, setInputMode] = useState(
    resumeText.trim().length > 0 && !selectedFile ? 'paste' : 'upload'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFilePicked = async (file) => {
    setFileError(null);
    onClearError();
    const lowerName = file.name.toLowerCase();
    const validExt = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!validExt) {
      setFileError('Unsupported format. Please upload a PDF, DOCX, TXT, or MD file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File exceeds the 10 MB limit. Please upload a smaller resume.');
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      onSelectedFileChange({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        base64,
      });
      onResumeTextChange('');
      setInputMode('upload');
    } catch {
      setFileError('Could not read the selected file. Please try again.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFilePicked(file);
    }
  };

  const applySample = (preset) => {
    onClearError();
    setFileError(null);
    onSelectedFileChange(null);
    onResumeTextChange(preset.resumeText);
    onTargetRoleChange(preset.targetRole);
    onJobDescriptionChange(preset.jobDescription);
    setInputMode('paste');
  };

  const wordCount = resumeText.trim() ? resumeText.trim().split(/\s+/).length : 0;
  const canSubmit =
    !isAnalyzing && (Boolean(selectedFile) || resumeText.trim().length >= 40);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Resume &amp; Role Diagnostic
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 max-w-2xl">
            Upload your resume and optionally paste a target job description to get an ATS match score, keyword gap breakdown, and concrete bullet-point rewrites.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applySample(preset)}
              disabled={isAnalyzing}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              Try: {preset.label}
            </button>
          ))}
        </div>
      </div>

      {(error || fileError) && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{fileError || error}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setFileError(null);
              onClearError();
            }}
            aria-label="Dismiss error"
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                1. Candidate Resume
              </h2>
            </div>

            <div
              role="tablist"
              aria-label="Resume input mode"
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            >
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'upload'}
                onClick={() => setInputMode('upload')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={inputMode === 'paste'}
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  inputMode === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paste Text
              </button>
            </div>
          </div>

          <div className="flex-1 pt-5 flex flex-col">
            {inputMode === 'upload' ? (
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload resume file"
                  className={`flex-1 min-h-[260px] border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isDragging
                      ? 'border-blue-600 bg-blue-50/60'
                      : selectedFile
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleFilePicked(file);
                      }
                      e.target.value = '';
                    }}
                  />

                  {selectedFile ? (
                    <div className="space-y-3 max-w-sm">
                      <div className="w-11 h-11 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 break-all">
                          {selectedFile.fileName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                          {formatBytes(selectedFile.sizeBytes)} · Ready for analysis
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          Replace File
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectedFileChange(null);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-w-xs">
                      <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        Drop your resume here, or click to browse
                      </p>
                      <p className="text-xs text-slate-500">
                        Supports PDF, DOCX, TXT, or Markdown up to 10 MB. PDF layout and visual hierarchy are analyzed directly.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Processed securely per session</span>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className="font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Prefer pasting plain text?
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-2">
                <label
                  htmlFor="resume-text-input"
                  className="text-xs font-medium text-slate-600"
                >
                  Paste full resume content (experience, skills, education)
                </label>
                <textarea
                  id="resume-text-input"
                  value={resumeText}
                  onChange={(e) => {
                    onResumeTextChange(e.target.value);
                    if (selectedFile) onSelectedFileChange(null);
                  }}
                  placeholder="Paste your resume text here..."
                  className="flex-1 min-h-[260px] w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="font-mono tabular-nums">
                    {wordCount} words
                  </span>
                  {resumeText.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onResumeTextChange('')}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Clear text
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">
                2. Target Role &amp; Job Description
              </h2>
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              Optional · Boosts accuracy
            </span>
          </div>

          <div className="flex-1 pt-5 flex flex-col gap-4">
            <div>
              <label
                htmlFor="target-role-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Target Job Title
              </label>
              <input
                id="target-role-input"
                type="text"
                value={targetRole}
                onChange={(e) => onTargetRoleChange(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer, Product Manager"
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label
                htmlFor="job-description-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Job Description
              </label>
              <textarea
                id="job-description-input"
                value={jobDescription}
                onChange={(e) => onJobDescriptionChange(e.target.value)}
                placeholder="Paste the job posting responsibilities and requirements here for targeted ATS keyword gap detection. Leave blank for a general executive resume audit."
                className="flex-1 min-h-[180px] w-full rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none leading-relaxed"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                {jobDescription.trim().length > 20
                  ? 'Mode: Targeted Role & ATS Keyword Match'
                  : 'Mode: General ATS & Impact Audit'}
              </p>

              <button
                type="button"
                onClick={onAnalyze}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Resume...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Resume</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
