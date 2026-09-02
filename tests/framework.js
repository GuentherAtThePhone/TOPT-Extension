/**
 * Lightweight, universal test framework for browser and Node.js.
 * Supports async/await, test lifecycle hooks (beforeEach/afterEach),
 * deep assertions, and hierarchical reporting.
 */

(function (global) {
  class AssertionError extends Error {
    constructor(message) {
      super(message);
      this.name = 'AssertionError';
    }
  }

  function deepEqual(a, b) {
    if (Object.is(a, b)) return true;
    if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') {
      return false;
    }

    // TypedArray comparisons (Uint8Array, etc.)
    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
      if (a.byteLength !== b.byteLength) return false;
      const arrA = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
      const arrB = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
      for (let i = 0; i < arrA.length; i++) {
        if (arrA[i] !== arrB[i]) return false;
      }
      return true;
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }

    return true;
  }

  function formatValue(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val}"`;
    if (ArrayBuffer.isView(val)) {
      return `Uint8Array([${Array.from(val).join(', ')}])`;
    }
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  class Expectation {
    constructor(actual, isNegated = false) {
      this.actual = actual;
      this.isNegated = isNegated;
    }

    get not() {
      return new Expectation(this.actual, !this.isNegated);
    }

    _assert(pass, message) {
      const finalPass = this.isNegated ? !pass : pass;
      if (!finalPass) {
        throw new AssertionError(message);
      }
    }

    toBe(expected) {
      const pass = Object.is(this.actual, expected);
      this._assert(
        pass,
        `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to be ${formatValue(expected)}`
      );
    }

    toEqual(expected) {
      const pass = deepEqual(this.actual, expected);
      this._assert(
        pass,
        `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to deeply equal ${formatValue(expected)}`
      );
    }

    toBeTruthy() {
      const pass = Boolean(this.actual);
      this._assert(pass, `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to be truthy`);
    }

    toBeFalsy() {
      const pass = !this.actual;
      this._assert(pass, `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to be falsy`);
    }

    toBeNull() {
      const pass = this.actual === null;
      this._assert(pass, `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to be null`);
    }

    toBeUndefined() {
      const pass = this.actual === undefined;
      this._assert(pass, `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to be undefined`);
    }

    toBeDefined() {
      const pass = this.actual !== undefined;
      this._assert(pass, `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to be defined`);
    }

    toContain(item) {
      let pass = false;
      if (typeof this.actual === 'string') {
        pass = this.actual.includes(item);
      } else if (Array.isArray(this.actual)) {
        pass = this.actual.some(x => deepEqual(x, item));
      } else if (this.actual instanceof Set || this.actual instanceof Map) {
        pass = this.actual.has(item);
      }
      this._assert(
        pass,
        `Expected ${formatValue(this.actual)} ${this.isNegated ? 'not ' : ''}to contain ${formatValue(item)}`
      );
    }

    toHaveLength(expectedLength) {
      const length = this.actual ? this.actual.length : undefined;
      const pass = length === expectedLength;
      this._assert(
        pass,
        `Expected length ${length} ${this.isNegated ? 'not ' : ''}to be ${expectedLength}`
      );
    }

    toBeCloseTo(expected, precision = 2) {
      const expectedDiff = Math.pow(10, -precision) / 2;
      const receivedDiff = Math.abs(this.actual - expected);
      const pass = receivedDiff < expectedDiff;
      this._assert(
        pass,
        `Expected ${this.actual} ${this.isNegated ? 'not ' : ''}to be close to ${expected} (within ${expectedDiff})`
      );
    }

    toThrow(pattern) {
      let threw = false;
      let errorThrown = null;

      if (typeof this.actual !== 'function') {
        throw new AssertionError('Expected actual value to be a function for toThrow()');
      }

      try {
        this.actual();
      } catch (err) {
        threw = true;
        errorThrown = err;
      }

      let match = threw;
      if (threw && pattern) {
        if (typeof pattern === 'string') {
          match = errorThrown.message.includes(pattern);
        } else if (pattern instanceof RegExp) {
          match = pattern.test(errorThrown.message);
        }
      }

      this._assert(
        match,
        `Expected function ${this.isNegated ? 'not ' : ''}to throw ${pattern ? `error matching "${pattern}"` : 'an error'}, but ${threw ? `threw "${errorThrown.message}"` : 'it did not throw'}`
      );
    }

    get rejects() {
      return {
        toThrow: async (pattern) => {
          let threw = false;
          let errorThrown = null;
          try {
            if (typeof this.actual === 'function') {
              await this.actual();
            } else {
              await this.actual;
            }
          } catch (err) {
            threw = true;
            errorThrown = err;
          }

          let match = threw;
          if (threw && pattern) {
            if (typeof pattern === 'string') {
              match = errorThrown.message.includes(pattern);
            } else if (pattern instanceof RegExp) {
              match = pattern.test(errorThrown.message);
            }
          }

          this._assert(
            match,
            `Expected promise ${this.isNegated ? 'not ' : ''}to reject ${pattern ? `with error matching "${pattern}"` : ''}, but ${threw ? `rejected with "${errorThrown.message}"` : 'it resolved'}`
          );
        }
      };
    }
  }

  class TestRunner {
    constructor() {
      this.suites = [];
      this.currentSuite = null;
    }

    describe(name, fn) {
      const suite = {
        name,
        tests: [],
        beforeEachHooks: [],
        afterEachHooks: [],
        parent: this.currentSuite,
        suites: []
      };

      if (this.currentSuite) {
        this.currentSuite.suites.push(suite);
      } else {
        this.suites.push(suite);
      }

      const prevSuite = this.currentSuite;
      this.currentSuite = suite;

      try {
        fn();
      } finally {
        this.currentSuite = prevSuite;
      }
    }

    it(name, fn) {
      if (!this.currentSuite) {
        this.describe('Root Suite', () => this.it(name, fn));
        return;
      }
      this.currentSuite.tests.push({
        name,
        fn,
        suite: this.currentSuite
      });
    }

    beforeEach(fn) {
      if (this.currentSuite) {
        this.currentSuite.beforeEachHooks.push(fn);
      }
    }

    afterEach(fn) {
      if (this.currentSuite) {
        this.currentSuite.afterEachHooks.push(fn);
      }
    }

    getHooks(suite, hookName) {
      const hooks = [];
      let cur = suite;
      while (cur) {
        hooks.unshift(...cur[hookName]);
        cur = cur.parent;
      }
      return hooks;
    }

    async runSuite(suite, onTestResult) {
      const suiteResult = {
        name: suite.name,
        tests: [],
        suites: [],
        passed: 0,
        failed: 0,
        duration: 0
      };

      const suiteStart = performance.now();

      for (const test of suite.tests) {
        const testResult = {
          name: test.name,
          suiteName: suite.name,
          status: 'passed',
          error: null,
          duration: 0
        };

        const beforeHooks = this.getHooks(suite, 'beforeEachHooks');
        const afterHooks = this.getHooks(suite, 'afterEachHooks');

        const testStart = performance.now();
        let testError = null;

        try {
          for (const hook of beforeHooks) {
            await hook();
          }

          await test.fn();
        } catch (err) {
          testError = err;
        } finally {
          // Guaranteed cleanup: afterEach hooks always run, even on assertion failure
          for (const hook of afterHooks) {
            try {
              await hook();
            } catch (hookErr) {
              if (!testError) testError = hookErr;
            }
          }
          testResult.duration = performance.now() - testStart;
        }

        if (testError) {
          testResult.status = 'failed';
          testResult.error = testError;
          suiteResult.failed++;
        } else {
          suiteResult.passed++;
        }

        suiteResult.tests.push(testResult);
        if (onTestResult) {
          onTestResult(testResult);
        }
      }

      for (const childSuite of suite.suites) {
        const childResult = await this.runSuite(childSuite, onTestResult);
        suiteResult.suites.push(childResult);
        suiteResult.passed += childResult.passed;
        suiteResult.failed += childResult.failed;
      }

      suiteResult.duration = performance.now() - suiteStart;
      return suiteResult;
    }

    async run(onTestResult) {
      const startTime = performance.now();
      const results = {
        suites: [],
        total: 0,
        passed: 0,
        failed: 0,
        duration: 0
      };

      for (const suite of this.suites) {
        const suiteResult = await this.runSuite(suite, onTestResult);
        results.suites.push(suiteResult);
        results.passed += suiteResult.passed;
        results.failed += suiteResult.failed;
      }

      results.total = results.passed + results.failed;
      results.duration = performance.now() - startTime;
      return results;
    }

    clear() {
      this.suites = [];
      this.currentSuite = null;
    }
  }

  const runner = new TestRunner();

  const framework = {
    describe: (name, fn) => runner.describe(name, fn),
    it: (name, fn) => runner.it(name, fn),
    test: (name, fn) => runner.it(name, fn),
    beforeEach: (fn) => runner.beforeEach(fn),
    afterEach: (fn) => runner.afterEach(fn),
    expect: (actual) => new Expectation(actual),
    runner,
    AssertionError
  };

  // Expose to global scope for easy use in tests
  global.describe = framework.describe;
  global.it = framework.it;
  global.test = framework.test;
  global.beforeEach = framework.beforeEach;
  global.afterEach = framework.afterEach;
  global.expect = framework.expect;
  global.testRunner = runner;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = framework;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);