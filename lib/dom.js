'use strict';
var OrderedSet = require('./ordered-set');

var safeNext = function(node) {
    return node ? node.next : null;
};

var forEachChild = function(node, f) {
    for (var child = node.firstChild, next = safeNext(child);
         child !== null;
         child = next, next = safeNext(child)) {
        f(child);
    }
};

var RollingHash = function() {
    this.hash = 0;
};

RollingHash.prototype.updateWithString = function(s) {
    for (var i = 0; i < s.length; i++) {
        this.updateWithInteger(s.charCodeAt(i));
    }
};

RollingHash.prototype.updateWithInteger = function(s) {
    // 'x >>> 0' <=> ToUint32(x), see ECMA262
    this.hash = (17 * this.hash + s) >>> 0;
};

RollingHash.prototype.digest = function(s) {
    return this.hash;
};


var calcAttrHash = function(node) {
    var hasher = new RollingHash;
    var attrs = [
        node.type,
        node.literal,
        node.destination,
        node.title,
        node.info,
        node.level,
        node.type != 'List' ? null : node.listType,
        node.type != 'List' ? null : node.listTight,
        node.type != 'List' ? null : node.listStart,
        node.type != 'List' ? null : node.listDelimiter
    ];
    hasher.updateWithString(JSON.stringify(attrs));
    return node.attrHashCode = hasher.digest();
};

var calcChildrenHash = function(node) {
    var hasher = new RollingHash;
    forEachChild(node, (child) => {
        hasher.updateWithInteger(calcHash(child));
    });
    return node.childrenHashCode = hasher.digest();
};

var calcHash = function(node) {
    var hasher = new RollingHash;
    hasher.updateWithInteger(calcAttrHash(node));
    hasher.updateWithInteger(calcChildrenHash(node));
    return node.hashCode = hasher.digest();
};

var NodeCache = function() {
    this.cache = {};
};

NodeCache.prototype.pushOne = function(node) {
    if (this.cache[node.hashCode] == null) {
        this.cache[node.hashCode] = new OrderedSet;
    }
    this.cache[node.hashCode].push(node);
};

NodeCache.prototype.useOne = function(hashCode) {
    if (this.cache[hashCode] == null) return null;
    return this.cache[hashCode].shift();
};

NodeCache.prototype.deleteOne = function(node) {
    if (this.cache[node.hashCode] == null) return false;
    return this.cache[node.hashCode].delete(node);
};


NodeCache.prototype.push = function(node) {
    this.pushOne(node);
    forEachChild(node, (child) => {
        this.push(child);
    });
};

NodeCache.prototype.clear = function() {
    this.cache = {};
};

NodeCache.prototype.delete = function(node) {
    this.deleteOne(node);
    if (node == null) return;
    forEachChild(node, (child) => {
        this.delete(child);
    });
};

NodeCache.prototype.use = function(hashCode) {
    var node = this.useOne(hashCode);
    if (node == null) return null;
    forEachChild(node, (child) => {
        this.delete(child);
    });
    var par = node.parent;
    while (par != null) {
        this.deleteOne(par);
        par = par.parent;
    }
    return node;

};



var Creator = function() {
    this.tree = null;
    this.cache = new NodeCache;
    this.creators = {
        Text: (node) => {
            node.dom = document.createTextNode('');
        },
        Softbreak: (node) => {
            node.dom = document.createTextNode('\n');
        },
        Hardbreak: (node) => {
            node.dom = document.createElement('br');
            node.container = node.dom;
        },
        Emph: (node) => {
            node.dom = document.createElement('em');
            node.container = node.dom;
        },
        Strong: (node) => {
            node.dom = document.createElement('strong');
            node.container = node.dom;
        },
        Html: (node) => {
            console.warn('raw html is not supported');
            node.dom = document.createTextNode('');
        },
        Link: (node) => {
            node.dom = document.createElement('a');
            node.container = node.dom;
        },
        Image: (node) => {
            node.dom = document.createElement('img');
            node.container = document.createElement('p');
        },
        Code: (node) => {
            node.dom = document.createElement('code');
        },
        Document: (node) => {
            node.dom = document.createElement('div');
            node.container = node.dom;
        },
        Paragraph: (node) => {
            node.dom = document.createElement('p');
            node.container = node.dom;
        },
        BlockQuote: (node) => {
            node.dom = document.createElement('blockquote');
            node.container = node.dom;
        },
        Item: (node) => {
            node.dom = document.createElement('li');
            node.container = node.dom;
        },
        List: (node) => {
            node.dom = document.createElement(
                node.listType == 'Bullet' ? 'ul' : 'ol');
            node.container = node.dom;
        },
        Header: (node) => {
            node.dom = document.createElement('h' + node.level);
            node.container = node.dom;
        },
        CodeBlock: (node) => {
            var text = document.createTextNode('');
            var code = document.createElement('code');
            var pre = document.createElement('pre');
            code.appendChild(text);
            pre.appendChild(code);
            node.dom = pre;
        },
        HtmlBlock: (node) => {
            node.dom = document.createElement('div');
        },
        HorizontalRule: (node) => {
            node.dom = document.createElement('hr');
        }
    };
    this.onUpdate = {
        Text: (node) => {
            node.dom.textContent = node.literal;
        },
        Html: (node) => {
            console.warn('raw html is not supported');
            node.dom.textContent = node.literal;
        },
        Link: (node) => {
            node.dom.setAttribute('href', node.destination);
            if (node.title) {
                node.dom.setAttribute('title', node.title);
            }
        },
        Image: (node) => {
            node.dom.setAttribute('src', node.destination);
            if (node.title) {
                node.dom.setAttribute('title', node.title);
            }
        },
        Code: (node) => {
            node.dom.textContent = node.literal;
        },
        List: (node) => {
            if (node.listStart != null &&
                node.listStart != 1) {
                node.dom.setAttribute(
                    'start',
                    node.listStart.toString());
            }
        },
        CodeBlock: (node) => {
            node.dom.textContent = node.literal;
        },
        HtmlBlock: (node) => {
            console.warn('raw html block is not supported');
            node.dom.textContent = node.literal;
        }
    };
    this.onChildUpdated = {
        Image: (node, dom) => {
            dom.setAttribute('alt',
                             node.container.textContent);
        }
    };
};

Creator.prototype.create = function(node) {
    this.creators[node.type](node);
    if (this.onUpdate[node.type]) {
        this.onUpdate[node.type](node, node.dom);
    }
    forEachChild(node, (child) => {
        child = this._replaceOrCreate(child);
        node.container.appendChild(child.dom);
    });
    if (this.onChildUpdated[node.type]) {
        this.onChildUpdated[node.type](node, node.dom);
    }
    return node.dom;
};

Creator.prototype._replaceOrCreate = function(node) {
    if (node.hashCode != null) {
        var cached = this.cache.use(node.hashCode);
        if (cached != null) {
            node.insertBefore(cached);
            node.unlink();
            return cached;
        }
    }
    this.create(node);
    return node;
};


Creator.prototype._update = function(node1, node2) {
    if (node1.hashCode == node2.hashCode) {
        throw 'hashCode must be difference';
    }
    node2.dom = node1.dom;
    var container = node2.container = node1.container;
    if (node1.attrHashCode != node2.attrHashCode) {
        if (node1.type != node2.type
            || (node1.type == 'List'
                && node1.listType != node2.listType)
            || (node1.type == 'Header'
                && node1.level != node2.level)) {

            if (node1.parent !== null) {
                node1.parent.container.removeChild(node1.dom);
            }
            this.cache.push(node1);
            this.create(node2);
            return node2.dom;
        }
        if (this.onUpdate[node2.type]) {
            this.onUpdate[node2.type](node2, node2.dom);
        }
    }
    if (node1.childrenHashCode != node2.childrenHashCode) {
        this._updateChildren(node1, node2);
        if (this.onChildUpdated[node2.type]) {
            this.onChildUpdated[node2.type](node2, node2.dom);
        }
    }
    return node2.dom;
};

Creator.prototype._updateChildren = function(node1, node2) {
    var container = node2.container;
    var c1r = node1.lastChild, c2r = node2.lastChild,
        c1r_prev, c2r_prev;
    while (c1r != null && c2r != null
           && c1r.hashCode == c2r.hashCode) {
        c1r_prev = c1r.prev, c2r_prev = c2r.prev;
        c2r.insertAfter(c1r);
        c2r.unlink();
        c1r = c1r_prev, c2r = c2r_prev;
    }
    c1r = (c1r != null ? c1r.next : node1.firstChild);
    c2r = (c2r != null ? c2r.next : node2.firstChild);
    var c1l = node1.firstChild, c2l = node2.firstChild,
        c1l_next, c2l_next;
    while (c1r != c1l && c2r != c2l &&
           c1l.hashCode == c2l.hashCode) {
        c1l_next = c1l.next, c2l_next = c2l.next;
        c2l.insertBefore(c1l);
        c2l.unlink();
        c1l = c1l_next, c2l = c2l_next;
    }
    if (c1r != c1l && c2r != c2l) {
        c1r = c1r == null ? node1.lastChild : c1r.prev;
        while (c1r != c1l) {
            c1r_prev = c1r.prev;
            container.removeChild(c1r.dom);
            this.cache.push(c1r);
            c1r = c1r.prev;
        }
        this._update(c1l, c2l);
        if (c2l.dom != c1l.dom) {
            container.insertBefore(c2l.dom, c2r ? c2r.dom : null);
        }
        c2l = c2l == null ? node2.firstChild : c2l.next;
        while (c2r != c2l) {
            c2l_next = c2l.next;
            c2l = this._replaceOrCreate(c2l);
            container.insertBefore(c2l.dom, c2r ? c2r.dom : null);
            c2l = c2l_next;
        }
    } else {
        while (c2r != c2l) {
            c2l_next = c2l.next;
            c2l = this._replaceOrCreate(c2l);
            container.insertBefore(c2l.dom, c2r ? c2r.dom : null);
            c2l = c2l_next;
        }
        while (c1r != c1l) {
            c1l_next = c1l.next;
            container.removeChild(c1l.dom);
            this.cache.push(c1l);
            c1l = c1l.next;
        }
    }
};

Creator.prototype.update = function(tree) {
    if (this.tree != null && this.tree.hashCode == null) {
        calcHash(this.tree);
    }
    console.time('hash');
    calcHash(tree);
    console.timeEnd('hash');
    if (this.tree == null) {
        this.create(tree);
    } else if (this.tree.hashCode == tree.hashCode) {
        tree = this.tree;
    } else {
        this._update(this.tree, tree);
    }
    this.tree = tree;
    this.cache.clear();
    return this.tree.dom;
};
module.exports = Creator;
