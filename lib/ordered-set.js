'use strict';

var OrderedSet = function() {
    this._ptr = new Map;
    this._sentinel =  {};
    this._sentinel.prev = this._sentinel;
    this._sentinel.next = this._sentinel;
};

Object.defineProperty(OrderedSet.prototype, '_first', {
    get: function() {
        return this._sentinel.next;
    },
    set: function(node) {
        this._sentinel.next = node;
    }
});

Object.defineProperty(OrderedSet.prototype, '_last', {
    get: function() {
        return this._sentinel.prev;
    },
    set: function(node) {
        this._sentinel.prev = node;
    }
});

Object.defineProperty(OrderedSet.prototype, 'size', {
    get: function() {
        return this._ptr.size;
    }
});

OrderedSet.prototype.push = function(val) {
    if (this.has(val)) return;
    var node = {
        val: val,
        prev: this._last,
        next: this._sentinel
    };
    this._ptr.set(val, node);
    this._last.next = node;
    this._last = node;
};

OrderedSet.prototype.pop = function() {
    var ret = this._last;
    if (ret === this._sentinel) return null;
    this._last = this._last.prev;
    this._last.next = this._sentinel;
    this._ptr.delete(ret.val);
    return ret.val;
};

OrderedSet.prototype.unshift = function(val) {
    if (this.has(val)) return;
    var node = {
        val: val,
        prev: this._sentinel,
        next: this._first
    };
    this._ptr.set(val, node);
    this._first.prev = node;
    this._first = node;
};

OrderedSet.prototype.shift = function() {
    var ret = this._first;
    if (ret === this._sentinel) return null;
    this._first = this._first.next;
    this._first.prev = this._sentinel;
    this._ptr.delete(ret.val);
    return ret.val;
};


OrderedSet.prototype.has = function(val) {
    return this._ptr.has(val);
};

OrderedSet.prototype.delete = function(val) {
    var node = this._ptr.get(val);
    if (node === undefined) return false;
    node.prev.next = node.next;
    node.next.prev = node.prev;
    this._ptr.delete(val);
    return true;
};

OrderedSet.prototype[Symbol.iterator] = function*() {
    var node = this._first;
    while (node !== this._sentinel) {
        yield node.val;
        node = node.next;
    }
};


OrderedSet.prototype.toString = function() {
    var buf = [];
    for (var val of this) {
        buf.push(val.toString());
    }
    return 'OrderedSet{' + buf.join(',') + '}';
};

module.exports = OrderedSet;
