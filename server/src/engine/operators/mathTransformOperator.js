const { Observable } = require('rxjs');

function createMathTransformOperator(config = {}) {
  const transformType = config.transformType || 'scale'; // 'scale', 'c_to_f', 'bar_to_psi', 'offset'
  const factor = Number(config.factor !== undefined ? config.factor : 1);
  const offset = Number(config.offset !== undefined ? config.offset : 0);

  return (source$) => new Observable((subscriber) => {
    return source$.subscribe({
      next(data) {
        const val = Number(data.value);
        let transformed = val;
        let newUnit = data.unit || '';

        switch (transformType) {
          case 'c_to_f':
            transformed = (val * 9/5) + 32;
            newUnit = '°F';
            break;
          case 'bar_to_psi':
            transformed = val * 14.5038;
            newUnit = 'PSI';
            break;
          case 'scale':
            transformed = val * factor + offset;
            break;
          case 'offset':
            transformed = val + offset;
            break;
          default:
            transformed = val * factor;
        }

        transformed = Math.round(transformed * 100) / 100;

        subscriber.next({
          ...data,
          originalValue: val,
          value: transformed,
          unit: newUnit
        });
      },
      error(err) { subscriber.error(err); },
      complete() { subscriber.complete(); }
    });
  });
}

module.exports = { createMathTransformOperator };