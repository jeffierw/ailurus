import { Check, Loader2 } from 'lucide-react';
import type { UploadProgressState } from '../../services/chainPipeline';

type StepStatus = 'pending' | 'active' | 'done';

function stepStatus(index: number, activeIndex: number): StepStatus {
  if (index < activeIndex) return 'done';
  if (index === activeIndex) return 'active';
  return 'pending';
}

export function UploadProgressPanel({ progress }: { progress: UploadProgressState }) {
  const activeIndex = progress.stepIndex;

  return (
    <div className="py-2">
      <p className="text-xs font-semibold tracking-widest text-muted uppercase mb-4">
        Submitting your response
      </p>
      <ol className="space-y-4">
        {progress.steps.map((step, index) => {
          const status = stepStatus(index, activeIndex);
          const isActive = status === 'active';
          const isDone = status === 'done';

          return (
            <li key={step.id} className="flex gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {isDone ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-panda text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin text-panda" />
                ) : (
                  <span className="h-5 w-5 rounded-full border-2 border-dashed border-border" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm leading-snug ${
                    isActive ? 'font-semibold text-ink' : isDone ? 'text-muted' : 'text-muted/70'
                  }`}
                >
                  {step.label}
                </p>
                {isActive && (progress.detail ?? ('caption' in step ? step.caption : undefined)) ? (
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {progress.detail ?? ('caption' in step ? step.caption : undefined)}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
