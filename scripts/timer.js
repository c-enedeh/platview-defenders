export function createTimer({ timeLimit, onTick, onExpire, urgencyThreshold = 30 }) {
  let remaining  = timeLimit;
  let elapsed    = 0;
  let intervalId = null;
  let expired    = false;

  function tick() {
    remaining -= 1;
    elapsed   += 1;
    const urgent = remaining <= urgencyThreshold;
    onTick({ remaining, elapsed, urgent });
    if (remaining <= 0 && !expired) {
      expired = true;
      stop();
      onExpire();
    }
  }

  function start() {
    if (intervalId !== null) return;
    intervalId = setInterval(tick, 1000);
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
  }

  function reset() {
    stop();
    remaining = timeLimit;
    elapsed   = 0;
    expired   = false;
  }

  return {
    start,
    stop,
    reset,
    getRemaining: () => remaining,
    getElapsed:   () => elapsed,
    isRunning:    () => intervalId !== null,
  };
}
