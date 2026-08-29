const { Observable } = require('rxjs');

function createThresholdOperator(config = {}) {
  const operator = config.operator || '>';
  const thresholdValue = Number(config.threshold !== undefined ? config.threshold : 80);

  return (source$) => new Observable((subscriber) => {
    return source$.subscribe({
      next(data) {
        const val = Number(data.value);
        let passed = false;

        switch (operator) {
          case '>':
            passed = val > thresholdValue;
            break;
          case '>=':
            passed = val >= thresholdValue;
            break;
          case '<':
            passed = val < thresholdValue;
            break;
          case '<=':
            passed = val <= thresholdValue;
            break;
          case '==':
          case '=':
            passed = Math.abs(val - thresholdValue) < 0.0001;
            break;
          case '!=':
            passed = Math.abs(val - thresholdValue) >= 0.0001;
            break;
          default:
            passed = val > thresholdValue;
        }

        if (passed) {
          subscriber.next({
            ...data,
            thresholdMet: true,
            ruleCondition: `${val} ${operator} ${thresholdValue}`,
            evaluatedAt: new Date()
          });
        }
      },
      error(err) { subscriber.error(err); },
      complete() { subscriber.complete(); }
    });
  });
}

module.exports = { createThresholdOperator };