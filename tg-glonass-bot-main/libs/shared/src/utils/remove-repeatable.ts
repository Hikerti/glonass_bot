import type {EveryRepeatOptions, Job, Queue} from "bull";

export async function removeRepeatable<T>(date: string, jod: Job<T>, queue: Queue ) {
    const now = new Date();
    const shouldStop = new Date(date).getTime() <= now.getTime();

    if (shouldStop) {
        const repeatOpts = jod.opts.repeat;

        const isEveryRepeat = repeatOpts && 'every' in repeatOpts;
        const interval = isEveryRepeat ? (repeatOpts as EveryRepeatOptions).every : undefined;
        const jobId = jod.opts.jobId;

        if (jobId && interval) {
            await queue.removeRepeatable({
                jobId: jobId as string,
                every: interval,
            });
            console.warn(`[Processor] Recurring job ${jobId} stopped. Date ${date} has passed.`);
        }

        return;
    }
}