import type { UserFunction, UserFunctionId } from '../types';

type DashboardPageProps = {
  functions: UserFunction[];
  onOpenFunction: (functionId: UserFunctionId) => void;
};

export function DashboardPage({ functions, onOpenFunction }: DashboardPageProps) {
  const functionCards = functions.filter((item) => item.id !== 'dashboard');

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fadeIn pb-10">
      <section className="rounded-2xl border border-[#E5E5E6] bg-[#FFFFFF] p-6 md:p-8 dark:border-white/10 dark:bg-white/[0.03] shadow-sm">
        <div className="max-w-2xl">
          <span className="rounded-full border border-[#E5E5E6] bg-[#F3F4F6] px-3 py-1 text-xs font-bold text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
            UserApp Function Workspace
          </span>
          <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight text-[#08090A] dark:text-white">
            Dashboard
          </h3>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-[#62666D] dark:text-neutral-400">
            Each sidebar option is now a standalone function. Add or update functions inside{' '}
            <span className="font-mono font-semibold text-[#08090A] dark:text-neutral-300">src/userapp/functions</span>. Each
            function owns its page or flow, and the fixed shell swaps the main workspace.
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-bold text-[#62666D] dark:text-neutral-300">Available functions</h4>
          <span className="text-xs font-semibold text-[#8A8F98] dark:text-neutral-500 bg-neutral-200/55 dark:bg-white/[0.06] px-2.5 py-1 rounded-full">{functionCards.length} active</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {functionCards.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.id}
                className="group rounded-2xl border border-[#E5E5E6] bg-[#FFFFFF] p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-[#F1F2F4] dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl border transition-colors group-hover:text-white ${item.accentClassName}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h5 className="text-base font-bold text-[#08090A] dark:text-white">{item.name}</h5>
                <p className="mt-3 min-h-12 text-sm leading-relaxed text-[#62666D] dark:text-neutral-500">{item.description}</p>
                <button
                  onClick={() => onOpenFunction(item.id)}
                  className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5E6] px-4 text-sm font-bold text-[#62666D] shadow-sm transition-colors hover:border-[#5E6AD2] hover:bg-[#5E6AD2]/5 hover:text-[#5E6AD2] dark:border-white/10 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:bg-white/[0.04] dark:hover:text-white cursor-pointer"
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
