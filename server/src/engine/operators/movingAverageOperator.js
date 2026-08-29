const { Observable } = require('rxjs');

function createMovingAverageOperator(config = {}) {
  const windowSize = Math.max(2, Math.min(parseInt(config.windowSize, 10) || 5, 100));
  const buffer = [];

  return (source$) => new Observable((subscriber) => {
    return source$.subscribe({
      next(data) {
        const currentVal = Number(data.value);
        buffer.push(currentVal);
        if (buffer.length > windowSize) {
          buffer.shift();
        }

        const sum = buffer.reduce((acc, curr) => acc + curr, 0);
        const movingAvg = Math.round((sum / buffer.length) * 100) / 100;

        subscriber.next({
          ...data,
          originalValue: currentVal,
          value: movingAvg,
          movingAverage: movingAvg,
          bufferWindow: [...buffer],
          windowFill: `${buffer.length}/${windowSize}`
        });
      },
      error(err) { subscriber.error(err); },
      complete() { subscriber.complete(); }
    });
  });
}

module.exports = { createMovingAverageOperator };