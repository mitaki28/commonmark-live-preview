'use strict';

var forEachChild = function(node, f) {
    for (var child = node.firstChild;
	 child !== null;
	 child = child.next) {
	f(child);
    }    
};

var forEachChildWithRemove = function(node, f) {
    for (var child = node.firstChild, next = child.next;
	 child !== null;
	 child = next, next = child ? child.next : null) {
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

var Creator = function() {
    this.tree = null;
    this.creators = {
	Text: (node) => {
	    return document.createTextNode('');
	},
	Softbreak: (node) => {
	    return document.createTextNode('\n');
	},
	Hardbreak: (node) => {
	    return document.createElement('br');
	},
	Emph: (node) => {
	    return document.createElement('em');
	},
	Strong: (node) => {
	    return document.createElement('strong');
	},
	Html: (node) => {
	    console.warn('raw html is not supported');
	    return document.createTextNode(node.literal);
	},
	Link: (node) => {
	    return document.createElement('a');
	},
	Image: (node) => {
	    return document.createElement('image');
	},
	Code: (node) => {
	    return document.createElement('code');
	},
	Document: (node) => {
	    return document.createElement('div');
	},
	Paragraph: (node) => {
	    return document.createElement('p');
	},
	BlockQuote: (node) => {
	    return document.createElement('blockquote');	
	},
	Item: (node) => {
	    return document.createElement('li');	
	},
	List: (node) => {
	    return document.createElement(
		node.listType == 'Bullet' ? 'ul' : 'ol');
	},
	Header: (node) => {
	    return document.createElement('h' + node.level);
	},
	CodeBlock: (node) => {
	    var text = document.createTextNode('');
	    var code = document.createElement('code');
	    var pre = document.createElement('pre');
	    code.appendChild(text);
	    pre.appendChild(code);
	    return pre;
	},
	HtmlBlock: (node) => {
	    return document.createElement('div');
	},
	HorizontalRule: (node) => {
	    return document.createElement('hr');
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
	    node.dom
		.firstChild
		.textContent = node.literal;
	}
    };
    this.specialRules = {
	Image: (node, dom) => {
	    var buf = [];
	    forEachChild(node, (child) => {
		buf.push(this.create(child).textContent);
	    });
	    dom.setAttribute('alt', buf.join(''));
	}
    };
};

Creator.prototype.create = function(node) {
    var dom = node.dom = this.creators[node.type](node);
    if (this.onUpdate[node.type]) {
	this.onUpdate[node.type](node, dom);
    }
    if (this.specialRules[node.type]) {
	this.specialRules[node.type](node, dom);
    } else {
	forEachChild(node, (child) => {
	    node.dom.appendChild(this.create(child));
	});
    }
    return dom;
};

Creator.prototype._update = function(node1, node2) {
    if (node1.hashCode == node2.hashCode) {
	throw 'hashCode must be difference';
    }
    var dom = node2.dom = node1.dom;
    if (node1.attrHashCode != node2.attrHashCode) {
	if (node1.type != node2.type
	    || (node1.type == 'List'
		&& node1.listType != node2.listType)
	    || (node1.type == 'Header'
		&& node1.level != node2.level)) {
	    node2.dom = this.create(node2);
	    return node2.dom;
	}
	if (this.onUpdate[node2.type]) {
	    this.onUpdate[node2.type](node2, node1.dom);
	}
    }
    if (node1.childrenHashCode != node2.childrenHashCode) {
	if (this.specialRules[node2.type]) {
	    this.specialRules[node2.type](node2, dom);
	} else {
	    this._updateChildren(node1, node2);
	}
    }
    return dom;
};

Creator.prototype._updateChildren = function(node1, node2) {
    var dom = node2.dom;
    var c1l = node1.firstChild, c2l = node2.firstChild,
	c1l_next, c2l_next;
    while (c1l != null && c2l != null
	   && c1l.hashCode == c2l.hashCode) {
	c1l_next = c1l.next, c2l_next = c2l.next;
	c2l.insertBefore(c1l);
	c2l.unlink();
	c1l = c1l_next, c2l = c2l_next;
    }
    c1l = (c1l != null ? c1l.prev : node1.lastChild);
    c2l = (c2l != null ? c2l.prev : node2.lastChild);
    var c1r = node1.lastChild, c2r = node2.lastChild,
	c1r_prev, c2r_prev;
    while (c1l != c1r && c2l != c2r &&
	   c1r.hashCode == c2r.hashCode) {
	c1r_prev = c1r.prev, c2r_prev = c2r.prev;
	c2r.insertAfter(c1r);
	c2r.unlink();
	c1r = c1r_prev, c2r = c2r_prev;
    }
    while (c1l != c1r && c2l != c2r) {
	c1r_prev = c1r.prev, c2r_prev = c2r.prev;
	if (c1r.hashCode != c2r.hashCode) {
	    this._update(c1r, c2r);
	    if (c2r.dom != c1r.dom) {
		dom.replaceChild(c2r.dom, c1r.dom);
	    }
	} else {
	    c2r.insertAfter(c1r);
	    c2r.unlink();
	}
	c1r = c1r_prev, c2r = c2r_prev;
    }
    while (c2l != c2r) {
	this.create(c2r);
	if (c2l == null) {
	    dom.insertBefore(c2r.dom, dom.firstChild);
	} else {
	    dom.insertBefore(c2r.dom, c2l.dom.nextSibling);
	}
	c2r = c2r.prev;
    }
    while (c1l != c1r) {
	dom.removeChild(c1r.dom);
	c1r = c1r.prev;
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
    return this.tree.dom;
};
module.exports = Creator;
