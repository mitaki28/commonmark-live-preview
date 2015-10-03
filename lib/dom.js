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

var appendChildren = function(node, dom) {
    forEachChild(node, (child) => {
	dom.appendChild(create(child));
    });
    return dom;
};

var appendChildrenTo = function(node, tagname) {
    return appendChildren(node, document.createElement(tagname));
};

var updater = {
    Text: function(node, dom) {
	dom.textContent = node.literal;
    },
    Softbreak: function(node, dom) {
	dom.textContent = '\n';
    },
    Hardbreak: function(node, dom) {},
    Emph: function(node, dom) {},
    Strong: function(node, dom) {},
    Html: function(node, dom) {
	console.warn('raw html is not supported');
	dom.textContent = node.literal;
    },
    Link: function(node, dom) {
	dom.setAttribute('href', node.destination);
	if (node.title) {
	    dom.setAttribute('title', node.title);
	}
    },
    Image: function(node, dom) {
	dom.setAttribute('src', node.destination);
	if (node.title) {
	    dom.setAttribute('title', node.title);
	}
    },
    Code: function(node, dom) {
	dom.firstChild.textContent = node.literal;
    },
    Document: function(node, dom) {},
    Paragraph: function(node, dom) {},
    BlockQuote: function(node, dom) {},
    Item: function(node, dom) {},
    List: function(node, dom) {
	if (node.listStart != null &&
	    node.listStart != 1) {
	    dom.setAttribute('start',
			     node.listStart.toString());
	}
    },
    Header: function(node, dom) {},
    CodeBlock: function(node, dom) {
	dom.firstChild.firstChild.textContent = node.literal;
    },
    HtmlBlock: function(node, dom) {
	console.warn('raw html block is not supported');
	dom.firstChild.textContent = node.literal;
    },
    HorizontalRule: function(node, dom) {}    
};

var creator = {
    Text: function(node) {
	return document.createTextNode(node.literal);
    },
    Softbreak: function(node) {
	return document.createTextNode('\n');
    },
    Hardbreak: function(node) {
	return document.createElement('br');
    },
    Emph: function(node) {
	return appendChildrenTo(node, 'em');
    },
    Strong: function(node) {
	return appendChildrenTo(node, 'strong');
    },
    Html: function(node) {
	console.warn('raw html is not supported');
	return document.createTextNode(node.literal);
    },
    Link: function(node) {
	var dom = document.createElement('a');
	dom.setAttribute('href', node.destination);
	if (node.title) {
	    dom.setAttribute('title', node.title);
	}
	return appendChildren(node, dom);
    },
    Image: function(node) {
	var dom = document.createElement('image');
	dom.setAttribute('src', node.destination);
	var buf = [];
	forEachChild(node, (child) => {
	    buf.push(create(child).textContent);
	});
	dom.setAttribute('alt', buf.join(''));
	if (node.title) {
	    dom.setAttribute('title', node.title);
	}
	return dom;
    },
    Code: function(node) {
	var dom = document.createElement('code');
	dom.appendChild(document.createTextNode(node.literal));
	return dom;
    },
    Document: function(node) {
	return appendChildrenTo(node, 'div');
    },
    Paragraph: function(node) {
	return appendChildrenTo(node, 'p');
    },
    BlockQuote: function(node) {
	return appendChildrenTo(node, 'blockquote');	
    },
    Item: function(node) {
	return appendChildrenTo(node, 'li');	
    },
    List: function(node) {
	var dom = document.createElement(
	    node.listType == 'Bullet' ? 'ul' : 'ol');
	if (node.listStart != null &&
	    node.listStart != 1) {
	    dom.setAttribute('start',
			     node.listStart.toString());
	}
	return appendChildren(node, dom);	
    },
    Header: function(node) {
	return appendChildrenTo(node, 'h' + node.level);
    },
    CodeBlock: function(node) {
	var text = document.createTextNode(node.literal);
	var code = document.createElement('code');
	var pre = document.createElement('pre');
	code.appendChild(text);
	pre.appendChild(code);
	return pre;
    },
    HtmlBlock: function(node) {
	console.warn('raw html block is not supported');
	var dom = document.createElement('div');
	dom.appendChild(document.createTextNode(node.literal));
	return dom;
    },
    HorizontalRule: function(node) {
	return document.createElement('hr');
    }
};

var create = function(node) {
    var dom = creator[node.type](node);
    node.dom = dom;
    return dom;
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

var update = function(node1, node2) {
    if (node1.hashCode == node2.hashCode) {
	throw 'hashCode must be difference';
    }
    if (node1.attrHashCode != node2.attrHashCode) {
	if (node1.type != node2.type
	    || (node1.type == 'List'
		&& node1.listType != node2.listType)
	    || (node1.type == 'Header'
		&& node1.level != node2.level)) {
	    node2.dom = create(node2);
	    return node2.dom;
	}
	updater[node2.type](node2, node1.dom);
    }
    var dom = node2.dom = node1.dom;
    if (node1.childrenHashCode != node2.childrenHashCode) {
	updateChildren(node1, node2);
    }
    return dom;
};

var updateChildren = function(node1, node2) {
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
	    update(c1r, c2r);
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
	create(c2r);
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

var SimpleCreator = function() {};
SimpleCreator.prototype.create = create;

var DiffCreator = function() {
    this.tree = null;
};
DiffCreator.prototype.create = function(tree) {
    console.time('hash');
    calcHash(tree);
    console.timeEnd('hash');
    if (this.tree == null) {
	create(tree);
    } else if (this.tree.hashCode == tree.hashCode) {
	tree = this.tree;
    } else {
	update(this.tree, tree);
    }
    this.tree = tree;
    return this.tree.dom;
};
module.exports.SimpleCreator = SimpleCreator;
module.exports.DiffCreator = DiffCreator;
