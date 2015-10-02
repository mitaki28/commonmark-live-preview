'use strict';

let crypto = require('crypto');

let foreachChild = function(node, f) {
    for (let child = node.firstChild;
	 child !== null;
	 child = child.next) {
	f(child);
    }    
};

let foreachChildWithRemove = function(node, f) {
    for (let child = node.firstChild, next = child.next;
	 child !== null;
	 child = next, next = child ? child.next : null) {
	f(child);
    }    
};

let appendChildren = function(node, dom) {
    foreachChild(node, (child) => {
	dom.appendChild(render(child));
    });
    return dom;
};

let appendChildrenTo = function(node, tagname) {
    return appendChildren(node, document.createElement(tagname));
};

let updater = {
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

let renderer = {
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
	let dom = document.createElement('a');
	dom.setAttribute('href', node.destination);
	if (node.title) {
	    dom.setAttribute('title', node.title);
	}
	return appendChildren(node, dom);
    },
    Image: function(node) {
	let dom = document.createElement('image');
	dom.setAttribute('src', node.destination);
	let buf = [];
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
	let dom = document.createElement('code');
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
	let dom = document.createElement(
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
	let text = document.createTextNode(node.literal);
	let code = document.createElement('code');
	let pre = document.createElement('pre');
	code.appendChild(text);
	pre.appendChild(code);
	return pre;
    },
    HtmlBlock: function(node) {
	console.warn('raw html block is not supported');
	let dom = document.createElement('div');
	dom.appendChild(document.createTextNode(node.literal));
	return dom;
    },
    HorizontalRule: function(node) {
	return document.createElement('hr');
    }
};


let render = function(node) {
    let dom = renderer[node.type](node);
    node.dom = dom;
    return dom;
};

let RollingHash = function() {
    this.hash = 0;
};

RollingHash.prototype.updateWithString = function(s) {
    for (let i = 0; i < s.length; i++) {
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


let calcAttrHash = function(node) {
    let hasher = new RollingHash;
    let attrs = [
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

let calcChildrenHash = function(node) {
    let hasher = new RollingHash;
    foreachChild(node, (child) => {
	hasher.updateWithInteger(calcHash(child));
    });
    return node.childrenHashCode = hasher.digest();
};

let calcHash = function(node) {
    let hasher = new RollingHash;
    hasher.updateWithInteger(calcAttrHash(node));
    hasher.updateWithInteger(calcChildrenHash(node));
    return node.hashCode = hasher.digest();
};

var renderDiff = function(node1, node2) {
    //console.log('update', node1.dom);
    if (node1.hashCode == node2.hashCode) {
	throw 'hashCode must be difference';
    }
    if (node1.attrHashCode != node2.attrHashCode) {
	if (node1.type != node2.type
	    || (node1.type == 'List'
		&& node1.listType != node2.listType)
	    || (node1.type == 'Header'
		&& node1.level != node2.level)) {
	    node2.dom = render(node2);
	    return node2.dom;
	}
	updater[node2.type](node2, node1.dom);
    }
    let dom = node2.dom = node1.dom;
    if (node1.childrenHashCode != node2.childrenHashCode) {
	renderDiffChildren_Simple(node1, node2);
    }
    return dom;
};

var renderDiffChildren_Simple = function(node1, node2) {
    let dom = node2.dom;
    let c1l = node1.firstChild, c2l = node2.firstChild;
    while (c1l != null && c2l != null
	   && c1l.hashCode == c2l.hashCode) {
	const c1l_next = c1l.next, c2l_next = c2l.next;
	c2l.insertBefore(c1l);
	c2l.unlink();
	c1l = c1l_next, c2l = c2l_next;
    }
    c1l = (c1l != null ? c1l.prev : node1.lastChild);
    c2l = (c2l != null ? c2l.prev : node2.lastChild);
    let c1r = node1.lastChild, c2r = node2.lastChild;
    while (c1l != c1r && c2l != c2r &&
	   c1r.hashCode == c2r.hashCode) {
	const c1r_prev = c1r.prev, c2r_prev = c2r.prev;
	c2r.insertAfter(c1r);
	c2r.unlink();
	c1r = c1r_prev, c2r = c2r_prev;
    }
    while (c1l != c1r && c2l != c2r) {
	const c1r_prev = c1r.prev, c2r_prev = c2r.prev;
	renderDiff(c1r, c2r);
	if (c2r.dom != c1r.dom) {
	    dom.replaceChild(c2r.dom, c1r.dom);
	}
	c1r = c1r_prev, c2r = c2r_prev;
    }
    while (c2l != c2r) {
	render(c2r);
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

let LCS = function(s1, s2) {
    const n = s1.length, m = s2.length;
    let dp = [], prv = [];
    for (let i = 0; i <= n; i++) {
	dp.push(new Array(m + 1, 0));
	prv.push(new Array(m + 1, 0));
    }
    for (let i = 0; i <= n; i++) {
	dp[i][0] = 0;
	prv[i][0] = VIR;
    }
    for (let i = 0; i <= m; i++) {
	dp[0][i] = 0;
	prv[0][i] = HOR;
    }
    const VIR = 2, HOR = 1, DIAG = 3;
    for (let i = 1; i <= n; i++) {
	for (let j = 1; j <= m; j++) {
	    dp[i][j] = dp[i - 1][j];
	    prv[i][j] = VIR;
	    if (dp[i][j] < dp[i][j - 1]) {
		dp[i][j] = dp[i][j - 1];
		prv[i][j] = HOR;
	    }
	    if (s1[i - 1] == s2[j - 1]
		&& dp[i][j] > dp[i - 1][j - 1]) {
		dp[i][j] = dp[i - 1][j - 1];
		prv[i][j] = DIAG;
	    }
	}
    }
    let i = n, j = m;
    let used1 = [], used2 = [];
    while (i != 0 || j != 0) {
	if (prv[i][j] == DIAG) {
	    used1.push(i);
	    used2.push(j);
	}
	if (prv[i][j] & 2) {
	    i++;
	}
	if (prv[i][j] & 1) {
	    j++;
	}
    }
    used1.reverse();
    used2.reverse();
    return [used1, used2];    
};

var renderDiffChildren_LCS = function(node1, node2) {
    let dom = node2.dom;
    let s1 = [], s2 = [];
    foreachChild(node1, (child) => {
	s1.push(child.hashCode);
    });    
    foreachChild(node2, (child) => {
	s2.push(child.hashCode);
    });
    let result = LCS(s1, s2);
    let used1 = result[0], used2 = result[1];
    let p = 0, q = 0;
    let rest = [];
    foreachChildWithRemove(node1, (child) => {
	if (q < used1.length && p == used1[q]) {
	    q++;
	} else {
	    rest.push(child);
	    dom.removeChild(child.dom);
	    child.unlink();
	}
	p++;
    });
    p = 0, q = 0;
    foreachChildWithRemove(node1, (child) => {
	if (q < used1.length && p == used1[q]) {
	    q++;
	} else {
	    rest.push(child);
	    dom.removeChild(child.dom);
	    child.unlink();
	}
	p++;
    });    
};

var renderDiffChildren = function(node1, node2) {
    let dom = node2.dom;
    let cache = new Map, needed = new Map, rest = [];
    foreachChild(node2, (child) => {
	if (!(child.hashCode in needed)) {
	    needed[child.hashCode] = [];
	}
	needed[child.hashCode].push(child);
    });
    foreachChild(node1, (child) => {
	if (needed[child.hashCode] != null
	    && needed[child.hashCode].length) {
	    if (!(child.hashCode in cache)) {
		cache[child.hashCode] = [];
	    }		
	    cache[child.hashCode].push(child);
	    needed[child.hashCode].pop();
	} else {
	    rest.push(child);
	}
	dom.removeChild(child.dom);
    });
    foreachChildWithRemove(node2, (child) => {
	if (cache[child.hashCode]
	    && cache[child.hashCode].length) {
	    let replaced = cache[child.hashCode].shift();
	    child.insertBefore(replaced);
	    child.unlink();
	    dom.appendChild(replaced.dom);
	} else if (rest.length) {
	    dom.appendChild(renderDiff(rest.shift(), child));
	} else {
	    dom.appendChild(render(child));
	}
    });
};

let SimpleRenderer = function() {};
SimpleRenderer.prototype.render = render;

let DiffRenderer = function() {
    this.tree = null;
};
DiffRenderer.prototype.calcHash = calcHash;
DiffRenderer.prototype.render = function(tree) {
    console.time('hash');
    calcHash(tree);
    console.timeEnd('hash');
    let dom = null;
    if (this.tree == null) {
	dom = render(tree);
    } else if (this.tree.hashCode == tree.hashCode) {
	tree = this.tree;
	dom = this.tree.dom;
    } else {
	renderDiff(this.tree, tree);
    }
    this.tree = tree;
    return this.tree.dom;
};
module.exports.SimpleRenderer = SimpleRenderer;
module.exports.DiffRenderer = DiffRenderer;
