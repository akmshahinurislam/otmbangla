import type { UserFunction, UserFunctionId } from '../types';

type DashboardPageProps = {
  functions: UserFunction[];
  onOpenFunction: (functionId: UserFunctionId) => void;
};

export function DashboardPage({ functions, onOpenFunction }: DashboardPageProps) {
  const functionCards = functions.filter((item) => item.id !== 'dashboard');

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fadeIn">
      <section className="rounded-lg border border-[#E5E5E6] bg-[#FFFFFF] p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="max-w-2xl">
          <span className="rounded-full border border-[#E5E5E6] bg-[#F3F4F6] px-2.5 py-1 text-xs font-medium text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
            UserApp Function Workspace
          </span>
          <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-[#08090A] dark:text-white">
            Each sidebar option is now a standalone function.
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#62666D] dark:text-neutral-400">
            Add or update functions inside{' '}
            <span className="font-mono text-[#08090A] dark:text-neutral-300">src/userapp/functions</span>. Each
            function owns its page or flow, and the fixed shell swaps the main workspace.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-[#62666D] dark:text-neutral-300">Available functions</h4>
          <span className="text-xs text-[#8A8F98] dark:text-neutral-600">{functionCards.length} active</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {functionCards.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.id}
                className="group rounded-lg border border-[#E5E5E6] bg-[#FFFFFF] p-4 transition-colors hover:bg-[#F1F2F4] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
              >
                <div
                  className={`mb-4 flex h-9 w-9 items-center justify-center rounded-md border transition-colors group-hover:text-white ${item.accentClassName}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <h5 className="text-sm font-semibold text-[#08090A] dark:text-white">{item.name}</h5>
                <p className="mt-2 min-h-12 text-xs leading-5 text-[#62666D] dark:text-neutral-500">{item.description}</p>
                <button
                  onClick={() => onOpenFunction(item.id)}
                  className="mt-4 flex h-8 items-center gap-1 rounded-md border border-[#E5E5E6] px-2.5 text-xs font-medium text-[#62666D] transition-colors hover:border-[#5E6AD2] hover:bg-[#F1F2F4] hover:text-[#5E6AD2] dark:border-white/10 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:bg-white/[0.04] dark:hover:text-white"
                >
                  <span>Open Function</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
