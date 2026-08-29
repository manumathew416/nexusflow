const { Observable } = require('rxjs');

function createDebounceOperator(config = {}) {
  const debounceSeconds = Math.max(1, Number(config.seconds || 5));
  let lastEmittedTime = 0;

  return (source$) => new Observable((subscriber) => {
    return source$.subscribe({
      next(data) {
        const now = Date.now();
        if (now - lastEmittedTime >= debounceSeconds * 1000) {
          lastEmittedTime = now;
          subscriber.next(data);
        }
      },
      error(err) { subscriber.error(err); },
      complete() { subscriber.complete(); }
    });
  });
}

module.exports = { createDebounceOperator };