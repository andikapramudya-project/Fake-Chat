// Abortable waits keep replay cancellation immediate, including between messages.
export const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const abort = () => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    reject(new DOMException("Cancelled", "AbortError"));
  };
  const timer = setTimeout(() => {
    signal?.removeEventListener("abort", abort);
    resolve();
  }, ms);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
});
