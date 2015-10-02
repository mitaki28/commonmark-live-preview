var crypto = require('crypto');

var foreachChild = function(node, f) {
    for (var child = node.firstChild;
	 child !== null;
	 child = child.next) {
	f(child);
    }    
};

var renderer = {
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
	foreachChild(node, (child) => {
	    buf.push(render(child).textContent);
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

var appendChildrenTo = function(node, tagname) {
    return appendChildren(node, document.createElement(tagname));
};

var appendChildren = function(node, dom) {
    foreachChild(node, (child) => {
	dom.appendChild(render(child));
    });
    return dom;
};

var render = function(node) {
    var dom = renderer[node.type](node);
    node.dom = dom;
    return dom;
};

var RollingHash = function() {
    this.hash = 0;
};

RollingHash.prototype.updateWithString = function(s) {
    for (var i = 0; i < s.length; i++) {
	this.hash = (this.hash * 13 + s.charCodeAt(i)) % 1000000007;
    }
    return;
};

RollingHash.prototype.updateWithInteger = function(s) {
    this.hash = (this.hash * 17 + s) % 1000000007;
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
    foreachChild(node, (child) => {
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

var renderDiff = function(node1, node2) {
    if (node1.hashCode == node2.hashCode) {
	node2.dom = node1.dom;
	for (var child1 = node1.firstChild,
		 child2 = node2.firstChild;
	     child1 != null && child2 != null;
	     child1 = child1.next, child2 = child2.next) {
	    renderDiff(child1, child2);
	}
	return node2.dom;
    }
    if (node1.attrHashCode != node2.attrHashCode) {
	if (node1.type != node2.type) {
	    node2.dom = render(node2);
	    return node2.dom;
	}
	// TODO
    }
    var dom = node2.dom = node1.dom;
    if (node1.childrenHashCode != node2.childrenHashCode) {
	var cache = new Map, needed = new Map, rest = [];
	foreachChild(node2, (child) => {
	    if (!(child.hashCode in needed)) {
		needed[child.hashCode] = [];
	    }
	    needed[child.hashCode].push(child);
	});
	foreachChild(node1, (child) => {
	    if (needed[child.hashCode] != null
		&& needed[child.hashCode].length) {
		rest.push(child);
		needed[child.hashCode].pop();
	    } else {
		if (!(child.hashCode in cache)) {
		    cache[child.hashCode] = [];
		}
		cache[child.hashCode].push(child);
	    }
	    dom.removeChild(child.dom);
	});
	foreachChild(node2, (child) => {
	    if (cache[child.hashCode] && cache[child.hashCode].length) {
		dom.appendChild(renderDiff(cache[child.hashCode].shift(), child));
	    } else if (rest.length) {
		dom.appendChild(renderDiff(rest.shift(), child));
	    } else {
		dom.appendChild(render(child));
	    }
	});
    }
    return dom;
};

var SimpleRenderer = function() {};
SimpleRenderer.prototype.render = render;

var DiffRenderer = function() {
    this.tree = null;
};
DiffRenderer.prototype.calcHash = calcHash;
DiffRenderer.prototype.render = function(tree) {
    console.time('hash');
    calcHash(tree);
    console.timeEnd('hash');
    var dom = null;
    if (this.tree == null) {
	dom = render(tree);
    } else {
	dom = renderDiff(this.tree, tree);
    }
    this.tree = tree;
    return dom;
};
module.exports.SimpleRenderer = SimpleRenderer;
module.exports.DiffRenderer = DiffRenderer;
