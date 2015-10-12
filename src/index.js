'use strict';

var cmark = require('commonmark');
var hljs = require('highlight.js');
var DomCreator = require('commonmark-dom-creator');
var htmlRenderer = new cmark.HtmlRenderer;
var creator = new DomCreator();
var parser = new cmark.Parser();
var Rule = require('commonmark-dom-creator/lib/rule').Rule;
var CodeBlockRule = require('commonmark-dom-creator/lib/rule/dom').CodeBlockRule;

class HighlightCodeBlockRule extends CodeBlockRule {
    highlight(node, lang) {
        if (lang == null) {
            node.dom._data.textContent = node.literal;
            return;
        }
        try {
            var result = hljs.highlight(lang,node.literal).value;
            node.dom._data.innerHTML = result;
        } catch (e) {
            node.dom._data.textContent = node.literal;
        }
    }

    update(node) {
        var info_words = node.info ? node.info.split(/\s+/) : [];
        if (info_words.length > 0 && info_words[0].length > 0) {
            this.highlight(node, info_words[0]);
        } else {
            this.highlight(node, null);
        }
    }
}

class LazyImageRule extends Rule {
    init(node) {
        node.dom = document.createElement('figure');
        node.container = document.createElement('p');
        node.dom._img = document.createElement('img');
        node.dom._loader = document.createElement('div');
        node.dom._loadButton = document.createElement('button');
        node.dom._loadButton.textContent = 'load';
        node.dom._src = document.createElement('a');
        node.dom._src.setAttribute('target', '_blank');
        node.dom._alt = node.container;
        node.dom._caption = document.createElement('figcaption');
        node.dom.appendChild(node.dom._loader);
        node.dom.appendChild(node.dom._img);

        node.dom._loader.appendChild(node.dom._loadButton);
        node.dom._loader.appendChild(node.dom._caption);
        node.dom._loader.appendChild(node.dom._src);
        node.dom._loader.appendChild(node.dom._alt);
    }

    update(node) {
        if (node.dom._img.parentNode == node.dom) {
            node.dom.removeChild(node.dom._img);
        }
        if (node.dom._loader.parentNode != node.dom) {
            node.dom.appendChild(node.dom._loader);
        }
        var src = node.destination;
        var title = node.title;
        node.dom._src.textContent = src;
        node.dom._src.setAttribute('href', src);
        if (title != null) {
            node.dom._caption.textContent = title;
        }
        node.dom._loadButton.onclick = (e) => {
            node.dom._img.setAttribute('alt',
                                       node.dom._alt.textContent);
            node.dom._img.setAttribute('src', src);
            if (title != null) {
                node.dom._img.setAttribute('title', title);
            }
            node.dom.appendChild(node.dom._img);
            node.dom.removeChild(node.dom._loader);
        };
    }
}

creator.rule.map['CodeBlock'] = new HighlightCodeBlockRule;
creator.rule.map['Image'] = new LazyImageRule;

function removeChildren(dom) {
    while (dom.lastChild) dom.removeChild(dom.lastChild);
}

function syncSourceMap(node1, node2) {
    var c1 = node1.firstChild, c2 = node2.firstChild;
    while (c1 != null) {
        syncSourceMap(c1, c2);
        c1 = c1.next, c2 = c2.next;
    }
    node2._sourcepos = node1._sourcepos;
}

function mapCursor(node, pos) {
    var c = node.firstChild;
    while (c != null) {
        var ans = mapCursor(c, pos);
        if (ans) return ans;
        c = c.next;
    }
    var npos = node.sourcepos;
    if (npos) {
        var srow = npos[0][0], scol = npos[0][1],
            erow = npos[1][0], ecol = npos[1][1];
        if (srow <= pos.row + 1 && pos.row + 1 <= erow) {
            return node;
        }
    }
    return null;
}

window.addEventListener('DOMContentLoaded', function() {
    var editor = ace.edit('edit');
    editor.setTheme('ace/theme/github');
    editor.getSession().setMode('ace/mode/markdown');
    editor.getSession().setUseWrapMode(true);
    var preview = document.getElementById('preview');
    var modeSelector = document.getElementById('mode');
    var render = function() {
        console.time('render');
        var tree = parser.parse(editor.getValue());
        var dom = creator.update(tree);
        if (!preview.contains(dom)) {
            removeChildren(preview);
            preview.appendChild(dom);
        }
        console.timeEnd('render');
    };
    editor.getSession().on('change', function(e) {
        render();
    });
    editor.commands.addCommand({
        name: 'sync view',
        bindKey: {win: 'Ctrl-l',  mac: 'Command-l'},
        exec: function(editor) {
            syncSourceMap(creator.tree,
                          parser.parse(editor.getValue()));
            var cursor = editor.getSelection().getCursor();
            var d = mapCursor(creator.tree, cursor);
            if (d != null && d.dom.parentNode != preview) {
                editor.centerSelection();
                preview.scrollTop = -preview.clientHeight / 2 + preview.scrollTop + d.dom.getBoundingClientRect().top;
            }
        }
    });
    render();
});
