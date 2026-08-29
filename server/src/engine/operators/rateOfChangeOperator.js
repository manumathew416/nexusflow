const { Observable } = require('rxjs');

function createRateOfChangeOperator(config = {}) {
  const thresholdDelta = Number(config.deltaThreshold || 10);
  let previousValue = null;
  let previousTime = null;

  return (source$) => new Observable((subscriber) => {
    return source$.subscribe({
      next(data) {
        const currentVal = Number(data.value);
        const currentTime = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();

        if (previousValue !== null) {
          const deltaValue = currentVal - previousValue;
          const deltaTimeSec = Math.max(0.1, (currentTime - previousTime) / 1000);
          const rateOfChange = Math.round((deltaValue / deltaTimeSec) * 100) / 100;

          if (Math.abs(rateOfChange) >= thresholdDelta) {
            subscriber.next({
              ...data,
              rateOfChange,
              deltaValue: Math.round(deltaValue * 100) / 100,
              previousValue,
              rateConditionMet: true
            });
          }
        }

        previousValue = currentVal;
        previousTime = currentTime;
      },
      error(err) { subscriber.error(err); },
      complete() { subscriber.complete(); }
    });
  });
}

module.exports = { createRateOfChangeOperator };