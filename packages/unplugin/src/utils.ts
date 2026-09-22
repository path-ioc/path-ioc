/**
 * 包装异步函数，实现“同一时间最多只有一个在执行，执行期间的新调用全部折叠阻塞，直到上一轮结束后以最新参数循环补跑最后一次”
 */
export function createTrailingRunner<Args extends unknown[], Result>(
  asyncFn: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  let isRunning = false;
  let pendingArgs: Args | null = null;
  let pendingWaiters: Array<{
    resolve: (val: Result | PromiseLike<Result>) => void;
    reject: (err: unknown) => void;
  }> = [];

  const startLoop = async (initialArgs: Args): Promise<Result> => {
    isRunning = true;
    let latestResult!: Result;
    let currentArgs: Args = initialArgs;

    while (true) {
      const argsToRun = currentArgs;
      const currentWaiters = pendingWaiters;

      pendingArgs = null;
      pendingWaiters = [];

      try {
        latestResult = await asyncFn(...argsToRun);
        currentWaiters.forEach((w) => w.resolve(latestResult));
      } catch (err) {
        currentWaiters.forEach((w) => w.reject(err));
      }

      if (pendingArgs !== null) {
        currentArgs = pendingArgs;
      } else {
        break;
      }
    }

    isRunning = false;
    return latestResult;
  };

  return (...args: Args): Promise<Result> => {
    if (!isRunning) {
      return startLoop(args);
    }
    pendingArgs = args;
    return new Promise<Result>((resolve, reject) => {
      pendingWaiters.push({ resolve, reject });
    });
  };
}
