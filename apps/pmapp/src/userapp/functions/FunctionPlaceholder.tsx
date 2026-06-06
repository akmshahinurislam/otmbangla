type FunctionPlaceholderProps = {
  functionName: string;
  functionPath: string;
  summary: string;
};

export function FunctionPlaceholder({ functionName, functionPath, summary }: FunctionPlaceholderProps) {
  return (
    <div className="mx-auto max-w-4xl animate-fadeIn">
      <div className="mb-6">
        <span className="rounded-full border border-[#E5E5E6] bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
          Function Ready
        </span>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#08090A] dark:text-white">{functionName}</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#62666D] dark:text-neutral-400">{summary}</p>
      </div>

      <div className="space-y-4 rounded-lg border border-[#E5E5E6] bg-[#FFFFFF] p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-4 border-b border-[#E5E5E6] pb-4 dark:border-white/10">
          <span className="text-sm font-semibold text-[#08090A] dark:text-white">Function Entry Point</span>
          <span className="truncate font-mono text-xs text-[#8A8F98] dark:text-neutral-500">{functionPath}</span>
        </div>
        <div className="flex h-44 flex-col items-center justify-center rounded-md border border-dashed border-[#E5E5E6] bg-[#F7F8F8] dark:border-white/10 dark:bg-neutral-950">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border border-[#E5E5E6] border-t-[#5E6AD2] dark:border-neutral-800 dark:border-t-neutral-300" />
          <span className="text-xs text-[#8A8F98] dark:text-neutral-500">
            Ready for this function's page, flow, API hooks, and forms.
          </span>
        </div>
      </div>
    </div>
  );
}
