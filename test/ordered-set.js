'use strict';
var assert = require('assert');
var OrderedSet = require('../lib/ordered-set');
assert.equal = assert.strictEqual;

var N = 100000;

describe('OrderedSet is', () => {
    var s;
    beforeEach(() => {
        s = new OrderedSet;
    });

    var check = function(exp, U) {
        var act = Array.from(s);
        assert.deepEqual(act, exp);
        U.forEach((e) => {
            assert.equal(s.has(e), exp.indexOf(e) != -1);
        });
    };

    describe('push 1 -> 2 -> 1 -> 3', () => {
        beforeEach(() => {
            s.push(1);
            s.push(2);
            s.push(1);
            s.push(3);
        });

        it('iterate [1, 2, 3]', () => {
            check([1, 2, 3], [1, 2, 3]);
        });

        it('delete 2 -> 2 -> 1 -> 3', () => {
            s.delete(2);
            check([1, 3], [1, 2, 3]);
            s.delete(2);
            check([1, 3], [1, 2, 3]);
            s.delete(1);
            check([3], [1, 2, 3]);
            s.delete(3);
            check([], [1, 2, 3]);

        });

        it('pop 3 -> 2 -> 1', () => {
            assert.equal(s.pop(), 3);
            check([1, 2], [1, 2, 3]);

            assert.equal(s.pop(), 2);
            check([1], [1, 2, 3]);

            assert.equal(s.pop(), 1);
            check([], [1, 2, 3]);

            assert.equal(s.pop(), null);
            check([], [1, 2, 3]);

            assert.equal(s.pop(), null);
            check([], [1, 2, 3]);
        });

        it('shift 1 -> 2 -> 3', () => {
            assert.equal(s.shift(), 1);
            assert.deepEqual(Array.from(s), [2, 3]);
            assert(!s.has(1));
            assert(s.has(2));
            assert(s.has(3));

            assert.equal(s.shift(), 2);
            assert.deepEqual(Array.from(s), [3]);
            assert(!s.has(2));
            assert(s.has(3));

            assert.equal(s.shift(), 3);
            assert.deepEqual(Array.from(s), []);
            assert(!s.has(3));

            assert.equal(s.shift(), null);
            assert.deepEqual(Array.from(s), []);
            assert.equal(s.shift(), null);
            assert.deepEqual(Array.from(s), []);
        });

        it('shift 1 -> pop 3 -> shift 2', () => {
            assert.equal(s.shift(), 1);
            assert.deepEqual(Array.from(s), [2, 3]);
            assert(!s.has(1));
            assert(s.has(2));
            assert(s.has(3));

            assert.equal(s.pop(), 3);
            assert.deepEqual(Array.from(s), [2]);
            assert(s.has(2));
            assert(!s.has(3));

            assert.equal(s.pop(), 2);
            assert.deepEqual(Array.from(s), []);
            assert(!s.has(2));

            assert.equal(s.shift(), null);
            assert.deepEqual(Array.from(s), []);
            assert.equal(s.pop(), null);
            assert.deepEqual(Array.from(s), []);
        });
    });
    describe('when unshift 1 -> 2 -> 1 -> 3', () => {
        beforeEach(() => {
            s.unshift(1);
            s.unshift(2);
            s.unshift(1);
            s.unshift(3);
        });

        it('iterate [3, 2, 1]', () => {
            assert.deepEqual(Array.from(s), [3, 2, 1]);
        });


        it('shift 3 -> 2 -> 1', () => {
            assert.equal(s.shift(), 3);
            assert.deepEqual(Array.from(s), [2, 1]);
            assert(!s.has(3));
            assert(s.has(2));
            assert(s.has(1));

            assert.equal(s.shift(), 2);
            assert.deepEqual(Array.from(s), [1]);
            assert(!s.has(2));
            assert(s.has(1));

            assert.equal(s.shift(), 1);
            assert.deepEqual(Array.from(s), []);
            assert(!s.has(1));

            assert.equal(s.shift(), null);
            assert.deepEqual(Array.from(s), []);
            assert.equal(s.shift(), null);
            assert.deepEqual(Array.from(s), []);
        });

        it('pop 1 -> 2 -> 3', () => {
            assert.equal(s.pop(), 1);
            assert(!s.has(1));
            assert(s.has(2));
            assert(s.has(3));

            assert.equal(s.pop(), 2);
            assert(!s.has(2));
            assert(s.has(3));

            assert.equal(s.pop(), 3);
            assert(!s.has(3));

            assert.equal(s.pop(), null);
            assert.equal(s.pop(), null);
        });
    });

    it('operates O(1)', () => {
        for (let i = 0; i < N; i++) {
            s.push(i);
        }
        for (let i = 0; i < N; i++) {
            s.has(i);
        }
        for (let i = 0; i < N; i++) {
            s.pop(i);
        }
        for (let i = 0; i < N; i++) {
            s.unshift(i);
        }
        for (let i = 0; i < N; i++) {
            s.shift(i);
        }
        for (let i = 0; i < N; i++) {
            s.push(i);
        }
        for (let i = 0; i < N; i++) {
            s.delete(i);
        }
        s.toString();
        assert.equal(s.size, 0);
    });


});
