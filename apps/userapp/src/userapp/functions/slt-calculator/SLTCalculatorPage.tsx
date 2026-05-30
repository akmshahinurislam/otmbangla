import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();

export function SLTCalculatorPage() {
  const [method, setMethod] = useState('pdf');
  const [oce, setOce] = useState('');
  const [nppi, setNppi] = useState('0.921');
  const [tenderId, setTenderId] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [disqualified, setDisqualified] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [manualBidders, setManualBidders] = useState([
    { name: '', amount: '' }
  ]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [pdfError, setPdfError] = useState('');

  // States for simulated modern analysis loading screen
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);

  // Debug log state to capture validation messages for UI display
  const [debugLogs, setDebugLogs] = useState('');

  useEffect(() => {
    return () => {
      if (pdfPreview) {
        URL.revokeObjectURL(pdfPreview);
      }
    };
  }, [pdfPreview]);

  const addBidderRow = () => {
    setManualBidders([...manualBidders, { name: '', amount: '' }]);
  };

  const removeBidderRow = (index: number) => {
    if (manualBidders.length > 1) {
      setManualBidders(manualBidders.filter((_, i) => i !== index));
    }
  };

  const updateBidder = (index: number, field: 'name' | 'amount', value: string) => {
    const copy = [...manualBidders];
    copy[index][field] = value;
    setManualBidders(copy);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validatePdfContent = async (file: File): Promise<{ isValid: boolean; tenderId?: string; openingDate?: string }> => {
    try {
      setDebugLogs('');
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, disableWorker: true });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const txt = await page.getTextContent();
        const strings = (txt.items as any[]).map(item => item.str).join(' ');
        fullText += ' ' + strings;
      }
      const log = (msg: string) => {
        console.log(msg);
        setDebugLogs(prev => prev + msg + '\n');
      };
      log('PDF text length: ' + fullText.length);
      log('PDF extracted snippet: ' + fullText.slice(0, 200));
      // More permissive checks and detailed logging - Only require a Tender Opening / Opening Report header
      const hasReport = /Tender\s+Opening\s+Report/i.test(fullText) || /Opening\s+Report/i.test(fullText) || /Tender\s+Opening/i.test(fullText);
      const hasId = /TND[-\s]?\d+/i.test(fullText) || /Tender\s*\/\s*Proposal\s*ID[\s:]*\w+/i.test(fullText);
      const hasOpeningDate = /Opening\s+Date/i.test(fullText);
      const hasOpeningTime = /Opening\s+Time/i.test(fullText);
      const hasDatePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i.test(fullText);
      const hasDateTime = (hasOpeningDate || hasOpeningTime) && hasDatePattern;
      log('Validation results:');
      log(' - Tender Opening Report present: ' + hasReport);
      log(' - Tender/Proposal ID present: ' + hasId);
      log(' - Opening Date/Time keyword present: ' + (hasOpeningDate || hasOpeningTime));
      log(' - Date pattern present: ' + hasDatePattern);
      log(`Overall valid (hasReport): ${hasReport}`);

      // We only strictly require the Opening Report Header to be present to validate the PDF structure
      const isValid = hasReport;
      if (!isValid) {
        return { isValid: false };
      }

      // Extract Tender ID
      let extractedId = '';
      const matchId = /Tender\s*\/\s*Proposal\s*ID[\s:]*(\w+)/i.exec(fullText);
      if (matchId) {
        extractedId = matchId[1];
      } else {
        const matchTnd = /TND[-\s]?(\d+)/i.exec(fullText);
        if (matchTnd) {
          extractedId = 'TND-' + matchTnd[1];
        }
      }

      // Extract Date
      let extractedDate = '';
      const dateRegex = /Opening\s+Date(?:\s+and\s+Time)?\s*[:\s]\s*(\d{1,2}[-\/\s][a-zA-Z0-9]{3,10}[-\/\s]\d{2,4}|\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{2,4})/i;
      const matchDate = dateRegex.exec(fullText);
      if (matchDate) {
        extractedDate = matchDate[1];
      }

      const parsePdfDate = (dateStr: string): string => {
        dateStr = dateStr.trim();
        const mmmMatch = /^(\d{1,2})[-\/\s]([a-zA-Z]{3,10})[-\/\s](\d{4})/i.exec(dateStr);
        if (mmmMatch) {
          const day = mmmMatch[1].padStart(2, '0');
          const monthStr = mmmMatch[2].toLowerCase().slice(0, 3);
          const year = mmmMatch[3];
          const months: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
          };
          const month = months[monthStr];
          if (month) return `${year}-${month}-${day}`;
        }
        const ddmmMatch = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/.exec(dateStr);
        if (ddmmMatch) {
          const day = ddmmMatch[1].padStart(2, '0');
          const month = ddmmMatch[2].padStart(2, '0');
          const year = ddmmMatch[3];
          return `${year}-${month}-${day}`;
        }
        const yyyymmddMatch = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/.exec(dateStr);
        if (yyyymmddMatch) {
          return `${yyyymmddMatch[1]}-${yyyymmddMatch[2].padStart(2, '0')}-${yyyymmddMatch[3].padStart(2, '0')}`;
        }
        return '';
      };

      const parsedDate = parsePdfDate(extractedDate);
      return {
        isValid: true,
        tenderId: extractedId,
        openingDate: parsedDate
      };
    } catch (e: any) {
      console.error('PDF validation error:', e);
      setDebugLogs(prev => prev + `PDF validation error: ${e.message || e}\n`);
      return { isValid: false };
    }
  };

  const processPdfUpload = async (file: File) => {
    if (!file) return;

    setPdfError('');
    setError('');
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 12;
      });
    }, 180);

    try {
      await new Promise(resolve => setTimeout(resolve, 1800));

      const { isValid, tenderId: extId, openingDate: extDate } = await validatePdfContent(file);
      if (!isValid) {
        setPdfError('Uploaded PDF does not appear to be a valid TOR document.');
        // Clean up any preview if set
        if (pdfPreview) {
          URL.revokeObjectURL(pdfPreview);
        }
        setPdfPreview(null);
        setPdfFile(null);
        return;
      }

      setPdfFile(file);

      if (pdfPreview) {
        URL.revokeObjectURL(pdfPreview);
      }

      const previewUrl = URL.createObjectURL(file);
      setPdfPreview(previewUrl);

      if (extId) {
        setTenderId(extId);
      } else {
        setTenderId('TND-2024-' + Math.floor(Math.random() * 10000));
      }

      if (extDate) {
        setOpeningDate(extDate);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setOpeningDate(today);
      }

      setUploadProgress(100);
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setIsUploading(false);
      }, 350);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Accept any file and let validation decide
      processPdfUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept any file; validation will filter invalid PDFs
      processPdfUpload(file);
    }
  };

  const removePdf = () => {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview);
    }
    setPdfFile(null);
    setPdfPreview(null);
    setUploadProgress(0);
    setTenderId('');
    setOpeningDate('');
    setResult(null);
    setPdfError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('method', method);
    formData.append('oce', oce);
    formData.append('nppi', nppi);
    formData.append('tender_id', tenderId);
    formData.append('opening_date', openingDate);
    formData.append('disqualified', disqualified);

    if (method === 'pdf' && pdfFile) formData.append('pdf_file', pdfFile);

    if (method === 'manual') {
      manualBidders.forEach((b) => {
        if (b.name && b.amount) {
          formData.append('b_name[]', b.name);
          formData.append('b_amount[]', b.amount);
        }
      });
    }

    try {
      // DEBUG: show form data in console before sending
      console.log('Submitting form data:', Object.fromEntries(formData.entries()));
      const resp = await fetch('/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) { // DEBUG response status
        const txt = await resp.text();
        console.error('Server response error:', resp.status, txt);
        throw new Error(txt || 'Server error');
      }

      const data = await resp.json();

      // Trigger simulating loading step animations for high UX satisfaction
      setIsAnalyzing(true);
      setAnalyzingStep(0);

      // Step transitions (each taking 1.0 second for a more satisfying UX)
      setTimeout(() => setAnalyzingStep(1), 1000);
      setTimeout(() => setAnalyzingStep(2), 2000);
      setTimeout(() => setAnalyzingStep(3), 3000);
      setTimeout(() => setAnalyzingStep(4), 4000);
      setTimeout(() => setAnalyzingStep(5), 5000);

      // Final delivery after 5.9 seconds
      setTimeout(() => {
        setIsAnalyzing(false);
        setResult(data);
      }, 5900);

    } catch (err: any) {
      setError(err.message || 'Unexpected error');
    }
  };

  // Base input focus classes to prevent layout adjustments while turning borders black
  const inputClasses = "w-full px-3 py-2 text-sm bg-white dark:bg-[#0d0d0d] border border-[#E5E5E6] dark:border-white/10 rounded-md outline-none focus:border-[#08090A] dark:focus:border-white text-[#08090A] dark:text-white placeholder:text-[#62666D] dark:placeholder:text-neutral-500 transition-colors";

  if (isAnalyzing) {
    const steps = [
      "Reading and parsing bidder inputs...",
      "Running NPPI official adjustments...",
      "Computing responsive bidder average...",
      "Calculating standard deviation limits...",
      "Finalizing SLT exclusions and ranks..."
    ];

    return (
      <div className="mx-auto max-w-md p-8 rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.03] shadow-lg text-center space-y-8 animate-fadeIn mt-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Animated Spinner with Pulsing Center */}
          <div className="relative flex items-center justify-center h-20 w-20">
            <div className="absolute animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#5E6AD2]" />
            <div className="absolute animate-pulse rounded-full h-8 w-8 bg-[#5E6AD2]/20" />
            <svg className="h-5 w-5 text-[#5E6AD2] animate-bounce animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-[#08090A] dark:text-white">
              Processing Tender Analysis
            </h2>
            <p className="text-xs text-[#62666D] dark:text-neutral-400">
              Running advanced evaluation algorithms
            </p>
          </div>
        </div>

        {/* Step-by-Step Pulse Checklist */}
        <div className="text-left space-y-3.5 border-t border-[#E5E5E6] dark:border-white/10 pt-6">
          {steps.map((step, idx) => {
            const isCompleted = analyzingStep > idx;
            const isActive = analyzingStep === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 text-xs transition-all duration-300 ${isCompleted ? 'text-green-600 dark:text-green-400 font-semibold' : isActive ? 'text-[#08090A] dark:text-white font-semibold' : 'text-neutral-400'}`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4 text-green-500 animate-fadeIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#5E6AD2] opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#5E6AD2]" />
                  </span>
                ) : (
                  <div className="h-3 w-3 rounded-full border border-neutral-300 dark:border-neutral-700" />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <SLTCalculatorResultsView
        result={result}
        onBack={() => setResult(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-flex rounded-full border border-[#E5E5E6] bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
          Calculator
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-[#08090A] dark:text-white">
          SLT Calculator
        </h1>
        <p className="text-sm text-[#62666D] dark:text-neutral-400">
          Analyze tender bids using OCE, NPPI, and bidder inputs
        </p>
      </div>

      {/* Main Card */}
      <div className="rounded-lg border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.03]">

        {/* Tab Switcher */}
        <div className="border-b border-[#E5E5E6] p-4 dark:border-white/10">
          <div className="inline-flex rounded-md bg-[#F3F4F6] p-1 dark:bg-white/[0.06]">
            <button
              type="button"
              onClick={() => setMethod('pdf')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${method === 'pdf'
                ? 'bg-white text-[#08090A] shadow-sm dark:bg-[#1a1a1a] dark:text-white'
                : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              PDF Upload
            </button>
            <button
              type="button"
              onClick={() => setMethod('manual')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${method === 'manual'
                ? 'bg-white text-[#08090A] shadow-sm dark:bg-[#1a1a1a] dark:text-white'
                : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                }`}
            >
              Manual Entry
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* PDF Upload Mode Dropzone */}
          {method === 'pdf' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#62666D] dark:text-neutral-400">
                Upload TOR (Tender Opening Report)
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="relative"
              >
                {!pdfFile && !isUploading && (
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                  />
                )}

                <div
                  className={`
                    relative overflow-hidden rounded-2xl border border-dashed transition-all duration-300
                    ${isDragOver
                      ? 'border-[#5E6AD2] bg-[#5E6AD2]/5 scale-[1.01]'
                      : pdfFile
                        ? 'border-green-500/30 bg-green-500/[0.03]'
                        : 'border-[#E5E5E6] bg-white hover:border-[#5E6AD2]/40 dark:border-white/10 dark:bg-white/[0.02]'
                    }
                  `}
                >
                  <div className="p-6">
                    {isUploading ? (
                      <div className="space-y-0">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5E6AD2]/10">
                            <svg
                              className="h-7 w-7 animate-pulse text-[#5E6AD2]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>

                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#08090A] dark:text-white">
                              Processing PDF...
                            </p>
                            <p className="mt-1 text-xs text-[#62666D] dark:text-neutral-400">
                              Extracting tender information
                            </p>
                          </div>

                          <span className="text-sm font-semibold text-[#5E6AD2]">
                            {Math.round(uploadProgress)}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-[#F3F4F6] dark:bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-[#5E6AD2] transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : pdfFile ? (
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 w-full animate-fadeIn">
                        <div className="relative flex-shrink-0">
                          <div className="flex h-28 w-20 items-center justify-center overflow-hidden rounded-xl border border-[#E5E5E6] bg-white shadow-sm dark:border-white/10 dark:bg-[#111]">
                            {pdfPreview ? (
                              <object
                                data={`${pdfPreview}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
                                type="application/pdf"
                                className="h-full w-full overflow-hidden pointer-events-none object-cover"
                              >
                                <svg
                                  className="h-10 w-10 text-red-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7V3h8l4 4v14H7V7z"
                                  />
                                </svg>
                              </object>
                            ) : (
                              <svg
                                className="h-10 w-10 text-red-500"
                                fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7V3h8l4 4v14H7V7z"
                                  />
                                </svg>
                            )}
                          </div>

                          <div className="absolute -right-2 -top-2 rounded-full border-4 border-white bg-green-500 p-1 dark:border-[#0d0d0d]">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>

                        <div className="w-full min-w-0 sm:flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-[#08090A] dark:text-white">
                                {pdfFile.name}
                              </h3>
                              <p className="mt-1 text-xs text-[#62666D] dark:text-neutral-400">
                                {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={removePdf}
                              className="relative z-30 rounded-lg border border-[#E5E5E6] px-3 py-1.5 text-xs font-medium text-[#62666D] transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-white/10 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              PDF uploaded successfully
                            </span>
                          </div>

                          <div className="mt-3 rounded-xl border border-[#E5E5E6] bg-[#F9FAFB] p-3 dark:border-white/10 dark:bg-white/[0.03]">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                <svg
                                  className="h-4 w-4 text-[#5E6AD2]"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01"
                                  />
                                </svg>
                              </div>

                              <div className="space-y-1">
                                <p className="text-xs font-medium text-[#08090A] dark:text-white">
                                  Auto extraction complete
                                </p>
                                <p className="text-xs text-[#62666D] dark:text-neutral-400">
                                  Tender ID and opening date were detected automatically.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3F4F6] dark:bg-white/[0.06]">
                          <svg
                            className="h-8 w-8 text-[#62666D]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                          </svg>
                        </div>

                        <div className="mt-5 space-y-1">
                          <p className="text-sm text-[#08090A] dark:text-white">
                            <span className="font-semibold text-[#5E6AD2]">
                              Click to upload
                            </span>{' '}
                            or drag & drop
                          </p>
                          <p className="text-xs text-[#62666D] dark:text-neutral-400">
                            PDF only • Max 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {pdfError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/50 rounded-xl mt-3 flex items-center gap-2 text-red-800 dark:text-red-300 animate-fadeIn">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs font-medium">{pdfError}</p>
                </div>
              )}
            </div>
          )}

          {/* Tender ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#62666D] dark:text-neutral-400">
              Tender ID
              {method === 'pdf' && pdfFile && <span className="ml-2 text-[#5E6AD2]">• Auto-filled</span>}
            </label>
            <input
              type="text"
              value={tenderId}
              onChange={e => setTenderId(e.target.value)}
              placeholder={method === 'pdf' ? "Will be extracted from PDF" : "Enter Tender ID"}
              className={inputClasses}
              disabled={method === 'pdf' && !!pdfFile}
            />
          </div>

          {/* Opening Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#62666D] dark:text-neutral-400">
              Tender Opening Date
              {method === 'pdf' && pdfFile && <span className="ml-2 text-[#5E6AD2]">• Auto-filled</span>}
            </label>
            <input
              type="text"
              placeholder="DD-MM-YYYY"
              value={method === 'pdf' && pdfFile ? (openingDate.split('-').length === 3 ? `${openingDate.split('-')[2]}-${openingDate.split('-')[1]}-${openingDate.split('-')[0]}` : openingDate) : openingDate}
              onChange={e => setOpeningDate(e.target.value)}
              className={inputClasses}
              disabled={method === 'pdf' && !!pdfFile}
            />
          </div>

          {/* OCE */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#62666D] dark:text-neutral-400">
              OCE <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={oce}
              onChange={e => setOce(e.target.value)}
              required
              className={inputClasses}
            />
          </div>

          {/* Current NPPI */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#62666D] dark:text-neutral-400">
              Current NPPI <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              value={nppi}
              onChange={e => setNppi(e.target.value)}
              required
              className={inputClasses}
            />
          </div>

          {/* Bidders Section - Visible ONLY in Manual Mode */}
          {method === 'manual' && (
            <div className="border-t border-[#E5E5E6] dark:border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[#08090A] dark:text-white">
                  Bidders / Tenderers Bids (As mentioned in TOR)
                </label>
                <button
                  type="button"
                  onClick={addBidderRow}
                  className="inline-flex items-center gap-1 rounded border border-[#E5E5E6] bg-white px-2.5 py-1 text-xs font-medium text-[#62666D] shadow-sm hover:bg-[#F3F4F6] dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300 dark:hover:bg-white/[0.06] transition-all"
                >
                  + Add Bidder
                </button>
              </div>

              <div className="space-y-2">
                {manualBidders.map((bidder, index) => (
                  <div key={index} className="flex items-center gap-3 animate-fadeIn">
                    <div className="flex" style={{ flexBasis: '70%' }}>
                      <input
                        type="text"
                        placeholder="Bidder Name"
                        value={bidder.name}
                        onChange={e => updateBidder(index, 'name', e.target.value)}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <div className="flex" style={{ flexBasis: '30%' }}>
                      <input
                        type="number"
                        step="any"
                        placeholder="Amount"
                        value={bidder.amount}
                        onChange={e => updateBidder(index, 'amount', e.target.value)}
                        required
                        className={inputClasses}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBidderRow(index)}
                      disabled={manualBidders.length <= 1}
                      className="p-2 border border-[#E5E5E6] rounded-md text-neutral-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/10 transition-colors focus:border-[#08090A] dark:focus:border-white outline-none"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider split zone */}
          <div className="border-t border-[#E5E5E6] dark:border-white/10" />

          {/* Advanced Section - Located at the very bottom beneath Bidders */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left group outline-none"
            >
              <span className="text-sm font-medium text-[#62666D] dark:text-neutral-400 group-hover:text-[#08090A] dark:group-hover:text-white transition-colors">
                Advanced
              </span>
              <svg
                className={`w-4 h-4 text-[#62666D] transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAdvanced && (
              <>
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-xs font-medium text-[#62666D] dark:text-neutral-400">
                    Disqualified Tenderers (SL No)
                  </label>
                  <input
                    type="text"
                    value={disqualified}
                    onChange={e => setDisqualified(e.target.value)}
                    placeholder="e.g., SL-001, SL-005, SL-012"
                    className={inputClasses}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#E5E5E6] dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setOce('');
                setNppi('0.921');
                setTenderId('');
                setOpeningDate('');
                setDisqualified('');
                removePdf();
                setManualBidders([{ name: '', amount: '' }]);
                setResult(null);
                setError('');
              }}
              className="px-4 py-2 text-sm font-medium text-[#62666D] dark:text-neutral-400 hover:text-[#08090A] dark:hover:text-white transition-colors outline-none"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#08090A] dark:bg-white dark:text-[#08090A] rounded-md hover:opacity-90 transition-opacity outline-none"
            >
              Calculate
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-6 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }

        input:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

interface SLTCalculatorResultsViewProps {
  result: any;
  onBack: () => void;
}

export function SLTCalculatorResultsView({ result, onBack }: SLTCalculatorResultsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'responsive' | 'excluded' | 'non-responsive'>('all');
  const [showAnalysis, setShowAnalysis] = useState(false);

  const records = result.records || [];
  const summary = result.summary || {};

  // Helper to format currency in Bangladeshi Taka (BDT)
  const formatBDT = (amount: any, minimumFractionDigits = 3) => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) return 'N/A';
    return '৳' + Number(amount).toLocaleString('en-IN', {
      minimumFractionDigits,
      maximumFractionDigits: minimumFractionDigits
    });
  };

  // Filter records based on search term and status tab
  const filteredRecords = records.filter((rec: any) => {
    const name = rec['NAME OF TENDERER'] || '';
    const slNo = rec['SL. NO'] || '';
    const nameMatch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slNo.toString().includes(searchTerm);

    if (!nameMatch) return false;

    const status = rec.STATUS || '';
    if (statusFilter === 'responsive') {
      return status.startsWith('L') || status === '1st Lowest (L1)' || status === 'Responsive';
    } else if (statusFilter === 'excluded') {
      return status === 'Excluded for SLT' || status === 'Excluded for above 10%';
    } else if (statusFilter === 'non-responsive') {
      return status === 'Technically Non-Responsive';
    }
    return true; // 'all'
  });

  // Calculate counts for tab badges
  const allCount = records.length;
  const responsiveCount = records.filter((r: any) => {
    const s = r.STATUS || '';
    return s.startsWith('L') || s === '1st Lowest (L1)' || s === 'Responsive';
  }).length;
  const excludedCount = records.filter((r: any) => r.STATUS === 'Excluded for SLT' || r.STATUS === 'Excluded for above 10%').length;
  const nonResponsiveCount = records.filter((r: any) => r.STATUS === 'Technically Non-Responsive').length;

  return (
    <>
      <style>{`
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }

        @media print {
          @page {
            margin: 0;
          }
          body {
            margin: 0;
            background: #fff;
            color: #000;
          }
          /* Hide all non-printable elements */
          body * {
            visibility: hidden;
          }
          #slt-print-area, #slt-print-area * {
            visibility: visible;
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          #slt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm 15mm;
            box-sizing: border-box;
            display: block !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-8 animate-fadeIn print:hidden">
        {/* Upper Navigation / Control Bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#E5E5E6] pb-5 dark:border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E5E6] bg-white px-3.5 py-2 text-xs font-semibold text-[#62666D] shadow-sm hover:border-[#5E6AD2] hover:bg-[#F9FAFB] hover:text-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300 dark:hover:border-white/20 dark:hover:bg-white/[0.05] transition-all cursor-pointer outline-none"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Calculator</span>
              </button>
              <span className="hidden md:inline h-4 w-px bg-[#E5E5E6] dark:bg-white/10" />
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 px-3 py-1 text-xs font-semibold text-[#5E6AD2] dark:bg-[#5E6AD2]/20 dark:text-[#717CFF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5E6AD2] dark:bg-[#717CFF] animate-pulse" />
                Tender ID: {summary.tender_id}
              </span>
              <span className="hidden md:inline h-4 w-px bg-[#E5E5E6] dark:bg-white/10" />
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-200/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Current NPPI: {summary.current_nppi}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-[#08090A] dark:text-white">
              SLT Assessment Report
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto mt-2 md:mt-0">
            {/* Tender ID & Current NPPI pills on the left of Print button on mobile viewports */}
            <div className="flex md:hidden items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5E6AD2]/10 border border-[#5E6AD2]/20 px-2.5 py-1 text-[10px] font-semibold text-[#5E6AD2] dark:bg-[#5E6AD2]/20 dark:text-[#717CFF] whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5E6AD2] dark:bg-[#717CFF] animate-pulse" />
                ID: {summary.tender_id}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                NPPI: {summary.current_nppi}
              </span>
            </div>

            <button
              onClick={() => {
                const oldTitle = document.title;
                document.title = `SLT_Assessment_Report_${summary.tender_id || 'Assessment'}`;
                window.print();
                document.title = oldTitle;
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5E6] bg-white px-3.5 py-2 text-xs font-semibold text-[#62666D] shadow-sm hover:bg-[#F9FAFB] dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300 dark:hover:border-white/20 dark:hover:bg-white/[0.05] transition-all cursor-pointer outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Full Width Bidders Evaluation Table Container */}
        <div className="w-full rounded-2xl border border-[#E5E5E6] bg-white p-5 dark:border-white/10 dark:bg-white/[0.01] shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E5E6] pb-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-sm font-semibold tracking-tight text-[#08090A] dark:text-white">
                Bidders Evaluation Table
              </h3>
            </div>
            <span className="text-xs text-neutral-400 font-medium">
              Showing {filteredRecords.length} of {records.length} records
            </span>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
            {/* Filter Tabs */}
            <div className="inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-white/[0.05] overflow-x-auto scrollbar-none text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${statusFilter === 'all'
                  ? 'bg-white text-[#08090A] shadow-sm dark:bg-[#1c1c1c] dark:text-white'
                  : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                  }`}
              >
                All Bidders ({allCount})
              </button>
              <button
                onClick={() => setStatusFilter('responsive')}
                className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${statusFilter === 'responsive'
                  ? 'bg-white text-[#08090A] shadow-sm dark:bg-[#1c1c1c] dark:text-white'
                  : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                  }`}
              >
                Responsive ({responsiveCount})
              </button>
              <button
                onClick={() => setStatusFilter('excluded')}
                className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${statusFilter === 'excluded'
                  ? 'bg-white text-[#08090A] shadow-sm dark:bg-[#1c1c1c] dark:text-white'
                  : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                  }`}
              >
                Excluded ({excludedCount})
              </button>
              <button
                onClick={() => setStatusFilter('non-responsive')}
                className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${statusFilter === 'non-responsive'
                  ? 'bg-white text-[#08090A] shadow-sm dark:bg-[#1c1c1c] dark:text-white'
                  : 'text-[#62666D] hover:text-[#08090A] dark:text-neutral-400 dark:hover:text-white'
                  }`}
              >
                Non-Responsive ({nonResponsiveCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-neutral-400 dark:text-neutral-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search tenderer..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-[#0f0f0f] border border-[#E5E5E6] dark:border-white/10 rounded-lg outline-none focus:border-[#5E6AD2] text-[#08090A] dark:text-white placeholder:text-neutral-400 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto border border-[#E5E5E6]/60 dark:border-white/[0.06] rounded-xl bg-white dark:bg-[#08090A]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E6] dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] text-[#62666D] dark:text-neutral-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-3.5 px-4 w-14 text-center">SL</th>
                  <th className="py-3.5 px-4">Name of Tenderer</th>
                  <th className="py-3.5 px-4 text-right">Bid Amount</th>
                  <th className="py-3.5 px-4 text-right">Variation %</th>
                  <th className="py-3.5 px-4 text-center">Status / Rank</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((rec: any, idx: number) => {
                    const isL1 = rec.STATUS === '1st Lowest (L1)';
                    const isRanked = (rec.STATUS && rec.STATUS.startsWith('L')) || isL1;
                    const isNonResp = rec.STATUS === 'Technically Non-Responsive';
                    const isAbove10 = rec.STATUS === 'Excluded for above 10%';
                    const isSlt = rec.STATUS === 'Excluded for SLT';

                    // Determine variation text color
                    let variationColor = "text-neutral-500 dark:text-neutral-400";
                    if (rec.VARIATION > 10) {
                      variationColor = "text-red-500 font-semibold";
                    } else if (rec.VARIATION < 0) {
                      variationColor = "text-emerald-500 font-semibold";
                    } else if (rec.VARIATION > 0) {
                      variationColor = "text-amber-500 font-semibold";
                    }

                    return (
                      <tr
                        key={idx}
                        className={`border-b border-[#E5E5E6]/40 dark:border-white/[0.04] hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-all duration-200 ${idx % 2 === 1 ? 'bg-neutral-50/50 dark:bg-white/[0.02]' : 'bg-white dark:bg-transparent'}`}
                      >
                        <td className="py-3.5 px-4 text-center text-neutral-400 dark:text-neutral-500 font-medium">
                          {rec['SL. NO']}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#08090A] dark:text-white max-w-[300px] truncate" title={rec['NAME OF TENDERER']}>
                          {rec['NAME OF TENDERER']}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#08090A] dark:text-white">
                          {formatBDT(rec.BID_AMOUNT)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono ${variationColor}`}>
                          {rec.VARIATION > 0 ? `+${rec.VARIATION}` : rec.VARIATION}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isL1 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 shadow-sm animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              1st Lowest (L1)
                            </span>
                          )}
                          {isRanked && !isL1 && (
                            <span className="inline-flex rounded-full bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/10 dark:border-blue-900/20 dark:text-blue-400">
                              {rec.STATUS}
                            </span>
                          )}
                          {isNonResp && (
                            <span className="inline-flex rounded-full bg-red-50 border border-red-100/50 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                              Non-Responsive
                            </span>
                          )}
                          {isAbove10 && (
                            <span className="inline-flex rounded-full bg-amber-50 border border-amber-200/50 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
                              Above 10%
                            </span>
                          )}
                          {isSlt && (
                            <span className="inline-flex rounded-full bg-pink-50 border border-pink-200/50 px-2.5 py-0.5 text-[10px] font-bold text-pink-700 dark:bg-pink-950/20 dark:border-pink-900/30 dark:text-pink-400">
                              Excluded (SLT)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400 dark:text-neutral-500 font-medium">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <svg className="w-8 h-8 text-neutral-300 dark:text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>No bidders found matching current search/filter.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3.5">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec: any, idx: number) => {
                const isL1 = rec.STATUS === '1st Lowest (L1)';
                const isRanked = (rec.STATUS && rec.STATUS.startsWith('L')) || isL1;
                const isNonResp = rec.STATUS === 'Technically Non-Responsive';
                const isAbove10 = rec.STATUS === 'Excluded for above 10%';
                const isSlt = rec.STATUS === 'Excluded for SLT';

                let variationColor = "text-neutral-500 dark:text-neutral-400";
                if (rec.VARIATION > 10) {
                  variationColor = "text-red-600 dark:text-red-400 font-extrabold";
                } else if (rec.VARIATION < 0) {
                  variationColor = "text-emerald-600 dark:text-emerald-400 font-extrabold";
                } else if (rec.VARIATION > 0) {
                  variationColor = "text-amber-600 dark:text-amber-400 font-extrabold";
                }

                return (
                  <div 
                    key={idx} 
                    className="rounded-2xl border border-[#E5E5E6] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.02] space-y-4 hover:shadow-md transition-all duration-300 relative overflow-hidden animate-fadeIn"
                  >
                    {/* Card Header (Tenderer SL Rank + Name + Status Pill) */}
                    <div className="flex flex-col gap-1.5 w-full">
                      <h4 className="text-xs font-extrabold text-main dark:text-white line-clamp-2" title={rec['NAME OF TENDERER']}>
                        #{rec['SL. NO']}. {rec['NAME OF TENDERER']}
                      </h4>
                      
                      <div className="flex items-center">
                        {isL1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400 shadow-sm animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            1st Lowest (L1)
                          </span>
                        )}
                        {isRanked && !isL1 && (
                          <span className="inline-flex rounded-full bg-blue-50 border border-blue-100/50 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/10 dark:border-blue-900/20 dark:text-blue-400">
                            {rec.STATUS}
                          </span>
                        )}
                        {isNonResp && (
                          <span className="inline-flex rounded-full bg-red-50 border border-red-100/50 px-2 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                            Non-Responsive
                          </span>
                        )}
                        {isAbove10 && (
                          <span className="inline-flex rounded-full bg-amber-50 border border-amber-200/50 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400">
                            Above 10%
                          </span>
                        )}
                        {isSlt && (
                          <span className="inline-flex rounded-full bg-pink-50 border border-pink-200/50 px-2 py-0.5 text-[9px] font-bold text-pink-700 dark:bg-pink-950/20 dark:border-pink-900/30 dark:text-pink-400">
                            Excluded (SLT)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Divided metrics (2 Columns: Bid Amount & Variation) */}
                    <div className="grid grid-cols-2 gap-2 border-t border-[#E5E5E6]/60 dark:border-white/5 pt-4 text-left">
                      {/* Bid Amount */}
                      <div className="border-r border-[#E5E5E6]/40 dark:border-white/5 pr-4 min-w-0">
                        <span className="text-sm font-extrabold text-main dark:text-white block font-mono truncate animate-fadeIn" title={formatBDT(rec.BID_AMOUNT, 3)}>
                          {formatBDT(rec.BID_AMOUNT, 3)}
                        </span>
                        <span className="text-[10px] text-muted dark:text-neutral-500 font-semibold tracking-tight uppercase block mt-1">
                          Bid Amount
                        </span>
                      </div>

                      {/* Variation */}
                      <div className="pl-4 min-w-0">
                        <span className={`text-sm font-extrabold block font-mono truncate animate-fadeIn ${variationColor}`}>
                          {rec.VARIATION > 0 ? `+${rec.VARIATION}` : rec.VARIATION}%
                        </span>
                        <span className="text-[10px] text-muted dark:text-neutral-500 font-semibold tracking-tight uppercase block mt-1">
                          Variation
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[#E5E5E6] bg-white p-8 text-center text-neutral-400 dark:border-white/10 dark:bg-white/[0.02]">
                No bidders found matching current filter.
              </div>
            )}
          </div>
        </div>

        {/* Modern Expandable Tender Metrics & Analysis */}
        <div className="rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.01] shadow-sm overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="flex items-center justify-between w-full p-5 text-left bg-[#F9FAFB] hover:bg-neutral-100/50 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors outline-none cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-all ${showAnalysis ? 'bg-[#5E6AD2]/10 text-[#5E6AD2]' : 'bg-neutral-200/50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#08090A] dark:text-white">
                  Tender Analysis, Calculations & Metrics
                </h3>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-medium">
                  Click to view SLT Limits, Weighted Averages, official estimate details and tender summary sheet
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5E6AD2] bg-[#5E6AD2]/10 px-2.5 py-0.5 rounded-full dark:bg-[#5E6AD2]/20 dark:text-[#717CFF] opacity-0 group-hover:opacity-100 transition-opacity">
                {showAnalysis ? 'Hide Details' : 'Expand Details'}
              </span>
              <svg
                className={`w-5 h-5 text-neutral-400 transition-transform duration-300 ${showAnalysis ? 'rotate-180 text-[#5E6AD2]' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {showAnalysis && (
            <div className="p-6 border-t border-[#E5E5E6] dark:border-white/10 bg-white dark:bg-transparent space-y-6 animate-fadeIn">
              {/* Split layout inside the expand panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Tender Summary details */}
                <div className="lg:col-span-1 space-y-5">
                  <div className="flex items-center gap-2 border-b border-[#E5E5E6] pb-3.5 dark:border-white/10">
                    <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-sm font-semibold tracking-tight text-[#08090A] dark:text-white">
                      Tender Details
                    </h3>
                  </div>

                  <div className="rounded-2xl border border-[#E5E5E6] bg-white p-6 dark:border-white/10 dark:bg-white/[0.01] shadow-sm space-y-3.5 text-xs">
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Tender ID</span>
                      <span className="font-semibold text-[#08090A] dark:text-white">{summary.tender_id}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Opening Date</span>
                      <span className="font-semibold text-[#08090A] dark:text-white">
                        {summary.opening_date.split('-').length === 3
                          ? `${summary.opening_date.split('-')[2]}-${summary.opening_date.split('-')[1]}-${summary.opening_date.split('-')[0]}`
                          : summary.opening_date}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Current NPPI</span>
                      <span className="font-semibold text-[#08090A] dark:text-white bg-neutral-100 dark:bg-neutral-800/60 px-2.5 py-0.5 rounded-md">
                        {summary.current_nppi}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Total Bidders</span>
                      <span className="font-semibold text-[#08090A] dark:text-white bg-neutral-100 dark:bg-neutral-800/60 px-2.5 py-0.5 rounded-md">
                        {summary.total_bidders}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Responsive Bidders</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 rounded-md">
                        {summary.responsive_bidders}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">1st Lowest (L1)</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 max-w-[150px] truncate" title={summary.first_lowest}>
                        {summary.first_lowest}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Bid Average</span>
                      <span className="font-semibold text-[#08090A] dark:text-white">
                        {formatBDT(summary.bid_average)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Technically Non-Responsive</span>
                      {summary.non_responsive !== "0" ? (
                        <span className="font-semibold text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/20 px-2.5 py-0.5 rounded-md" title={summary.non_responsive}>
                          {summary.non_responsive}
                        </span>
                      ) : (
                        <span className="font-semibold text-neutral-400 dark:text-neutral-600">0</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#E5E5E6]/40 dark:border-white/[0.03]">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Excluded (Above 10%)</span>
                      {summary.above_10 !== "0" ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 px-2.5 py-0.5 rounded-md" title={summary.above_10}>
                          {summary.above_10}
                        </span>
                      ) : (
                        <span className="font-semibold text-neutral-400 dark:text-neutral-600">0</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-[#62666D] dark:text-neutral-400 font-medium">Excluded (SLT Limit)</span>
                      {summary.excluded_for_slt !== "0" ? (
                        <span className="font-semibold text-pink-600 dark:text-pink-400 bg-[#5E6AD2]/10 px-2.5 py-0.5 rounded-md" title={summary.excluded_for_slt}>
                          {summary.excluded_for_slt}
                        </span>
                      ) : (
                        <span className="font-semibold text-neutral-400 dark:text-neutral-600">0</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Redesigned Formula Calculations & Limits with Stacked Rows (Zero Cropping) */}
                <div className="lg:col-span-1 space-y-5">
                  <div className="flex items-center gap-2 border-b border-[#E5E5E6] pb-3.5 dark:border-white/10">
                    <svg className="w-4 h-4 text-[#5E6AD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <h3 className="text-sm font-semibold tracking-tight text-[#08090A] dark:text-white">
                      Formula Calculations & Limits
                    </h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Row 1: SLT Limit */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-red-500/20 bg-gradient-to-r from-red-50/20 to-rose-50/10 dark:border-red-500/30 dark:from-red-950/[0.04] dark:to-rose-950/[0.02] shadow-sm relative overflow-hidden group hover:border-red-500/40 hover:shadow-md transition-all duration-300 gap-4 w-full">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.04] rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                      <div className="relative z-10 flex flex-col gap-1.5 max-w-[70%]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                            SLT Limit
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 text-right min-w-[200px]">
                        <span className="text-lg font-bold font-mono text-red-600 dark:text-red-400 tracking-tight break-all">
                          {formatBDT(summary.slt_limit, 3)}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Weighted Average */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.01] shadow-sm relative overflow-hidden group hover:border-[#5E6AD2]/30 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-all duration-300 gap-4 w-full">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5E6AD2]/[0.02] rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                      <div className="relative z-10 flex flex-col gap-1.5 max-w-[70%]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full bg-[#5E6AD2]" />
                          <span className="text-xs font-semibold text-[#08090A] dark:text-white">
                            Weighted Average
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 text-right min-w-[200px]">
                        <span className="text-lg font-bold font-mono text-[#08090A] dark:text-white tracking-tight break-all">
                          {formatBDT(summary.weighted_avg, 3)}
                        </span>
                      </div>
                    </div>

                    {/* Row 3: Weighted SD */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.01] shadow-sm relative overflow-hidden group hover:border-[#5E6AD2]/30 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-all duration-300 gap-4 w-full">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5E6AD2]/[0.02] rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                      <div className="relative z-10 flex flex-col gap-1.5 max-w-[70%]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-500" />
                          <span className="text-xs font-semibold text-[#08090A] dark:text-white">
                            Weighted SD
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 text-right min-w-[200px]">
                        <span className="text-lg font-bold font-mono text-[#08090A] dark:text-white tracking-tight break-all">
                          {formatBDT(summary.weighted_sd_val, 3)}
                        </span>
                      </div>
                    </div>

                    {/* Row 4: Adjusted OE */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.01] shadow-sm relative overflow-hidden group hover:border-[#5E6AD2]/30 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-all duration-300 gap-4 w-full">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5E6AD2]/[0.02] rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                      <div className="relative z-10 flex flex-col gap-1.5 max-w-[70%]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full bg-indigo-400" />
                          <span className="text-xs font-semibold text-[#08090A] dark:text-white">
                            Adjusted Official Estimate
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 text-right min-w-[200px]">
                        <span className="text-lg font-bold font-mono text-[#08090A] dark:text-white tracking-tight break-all">
                          {formatBDT(summary.adjusted_oe, 3)}
                        </span>
                      </div>
                    </div>

                    {/* Row 5: Official Estimate */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.01] shadow-sm relative overflow-hidden group hover:border-[#5E6AD2]/30 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-all duration-300 gap-4 w-full">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                      <div className="relative z-10 flex flex-col gap-1.5 max-w-[70%]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-[#08090A] dark:text-white">
                            Official Estimate (OCE)
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 text-right min-w-[200px]">
                        <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight break-all">
                          {formatBDT(summary.oce, 3)}
                        </span>
                      </div>
                    </div>

                    {/* Row 6: Current NPPI */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl border border-[#E5E5E6] bg-white dark:border-white/10 dark:bg-white/[0.01] shadow-sm relative overflow-hidden group hover:border-[#5E6AD2]/30 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-all duration-300 gap-4 w-full">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#5E6AD2]/[0.02] rounded-full blur-2xl group-hover:scale-150 transition-all duration-500" />
                      <div className="relative z-10 flex flex-col gap-1.5 max-w-[70%]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="h-2 w-2 rounded-full bg-[#5E6AD2]" />
                          <span className="text-xs font-semibold text-[#08090A] dark:text-white">
                            Current NPPI
                          </span>
                        </div>
                      </div>
                      <div className="relative z-10 text-right min-w-[200px]">
                        <span className="text-lg font-bold font-mono text-[#08090A] dark:text-white tracking-tight break-all">
                          {summary.current_nppi}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Area - Only Visible on Print (Highly Professional Excel Table Layout) */}
      <div id="slt-print-area" className="hidden print:block p-10 bg-white text-black font-sans w-full max-w-[900px] mx-auto min-h-screen relative pb-20">
        {/* Header Block */}
        <div className="border-b border-neutral-300 pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-neutral-900 font-serif">SLT Assessment Report</h1>
            <p className="text-xs text-neutral-500 mt-1 uppercase font-semibold">OTMBangla Auto-Evaluator Output</p>
          </div>
          <div className="text-right text-xs space-y-1">
            <p className="font-semibold text-neutral-700">Generated: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Simple Metadata Header - Tender ID, Opening Date, and Current NPPI */}
        <div className="flex gap-8 text-xs font-semibold text-neutral-700 mb-6">
          <div>
            <span className="text-neutral-500 mr-2">Tender ID:</span>
            <span className="text-neutral-900 font-bold">{summary.tender_id}</span>
          </div>
          <div>
            <span className="text-neutral-500 mr-2">Opening Date:</span>
            <span className="text-neutral-900 font-bold">
              {summary.opening_date.split('-').length === 3
                ? `${summary.opening_date.split('-')[2]}-${summary.opening_date.split('-')[1]}-${summary.opening_date.split('-')[0]}`
                : summary.opening_date}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 mr-2">Current NPPI:</span>
            <span className="text-neutral-900 font-bold">{summary.current_nppi}</span>
          </div>
        </div>

        {/* Excel-like Table Header and Grid Lines */}
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 mb-3 font-serif">Bidders Evaluation Sheet</h2>
        <table className="w-full text-left border-collapse border border-neutral-300 text-xs">
          <thead>
            <tr className="bg-neutral-100 font-bold text-neutral-800 uppercase tracking-wider text-[10px] border-b border-neutral-300">
              <th className="py-2.5 px-3 border border-neutral-300 text-center w-12 bg-neutral-100 font-bold">SL</th>
              <th className="py-2.5 px-3 border border-neutral-300 bg-neutral-100 font-bold">Name of Tenderer</th>
              <th className="py-2.5 px-3 border border-neutral-300 text-right bg-neutral-100 font-bold">Bid Amount</th>
              <th className="py-2.5 px-3 border border-neutral-300 text-right bg-neutral-100 font-bold">Variation %</th>
              <th className="py-2.5 px-3 border border-neutral-300 text-center bg-neutral-100 font-bold">Status / Rank</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec: any, idx: number) => {
              const isL1 = rec.STATUS === '1st Lowest (L1)';
              const isRanked = (rec.STATUS && rec.STATUS.startsWith('L')) || isL1;
              const isNonResp = rec.STATUS === 'Technically Non-Responsive';
              const isAbove10 = rec.STATUS === 'Excluded for above 10%' || rec.STATUS === 'Above 10%';
              const isSlt = rec.STATUS === 'Excluded for SLT';

              let statusText = rec.STATUS || 'N/A';
              if (isAbove10) statusText = 'Above 10%';

              return (
                <tr key={idx} className={`border-b border-neutral-200 ${idx % 2 === 1 ? 'bg-neutral-50/50' : 'bg-white'}`}>
                  <td className="py-2 px-3 border border-neutral-300 text-center text-neutral-600 font-medium">
                    {rec['SL. NO']}
                  </td>
                  <td className="py-2 px-3 border border-neutral-300 font-semibold text-neutral-900">
                    {rec['NAME OF TENDERER']}
                  </td>
                  <td className="py-2 px-3 border border-neutral-300 text-right font-mono font-semibold text-neutral-900">
                    {formatBDT(rec.BID_AMOUNT, 3)}
                  </td>
                  <td className="py-2 px-3 border border-neutral-300 text-right font-mono text-neutral-800">
                    {rec.VARIATION > 0 ? `+${rec.VARIATION}` : rec.VARIATION}%
                  </td>
                  <td className="py-2 px-3 border border-neutral-300 text-center font-bold text-neutral-800">
                    {statusText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer verification note with custom url and page number */}
        <div className="absolute bottom-6 left-10 right-10 flex justify-between items-center text-[10px] text-neutral-400 border-t border-neutral-200 pt-4 font-mono">
          <span>otmbangla.com/slt-calculator</span>
          <span>1/1</span>
        </div>
      </div>
    </>
  );
}