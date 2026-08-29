const { Observable } = require('rxjs');

function createRangeGateOperator(config = {}) {
  const min = Number(config.min !== undefined ? config.min : 20);
  const max = Number(config.max !== undefined ? config.max : 80);
  const mode = config.mode || 'outside'; // 'inside' or 'outside'

  return (source$) => new Observable((subscriber) => {
    return source$.subscribe({
      next(data) {
        const val = Number(data.value);
        const isInside = val >= min && val <= max;
        const passed = mode === 'inside' ? isInside : !isInside;

        if (passed) {
          subscriber.next({
            ...data,
            rangeMet: true,
            rangeCondition: `${val} ${mode} [${min}, ${max}]`
          });
        }
      },
      error(err) { subscriber.error(err); },
      complete() { subscriber.complete(); }
    });
  });
}

module.exports = { createRangeGateOperator };