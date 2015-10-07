var cmark = require('commonmark');
var hljs = require('highlight.js');
var DomCreator = require('commonmark-dom-creator');
var htmlRenderer = new cmark.HtmlRenderer;
var creator = new DomCreator();
var parser = new cmark.Parser();

creator.onUpdate['CodeBlock'] = (node) => {
    var info_words = node.info ? node.info.split(/\s+/) : [];
    if (info_words.length > 0 && info_words[0].length > 0) {
        try {
            node.dom.firstChild.innerHTML = hljs.highlight(info_words[0], node.literal).value;
        } catch (e) {
            node.dom.firstChild.textContent = node.literal;
        }
        return;
    }
    node.dom.firstChild.innerHTML = hljs.highlightAuto(node.literal).value;
};

creator.creators['Image'] = (node) => {
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
};

creator.onUpdate['Image'] = (node) => {
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
};

delete creator.onChildUpdated['Image'];


function removeChildren(dom) {
    while (dom.lastChild) dom.removeChild(dom.lastChild);
}

window.addEventListener('DOMContentLoaded', function() {
    var text = document.getElementById('text');
    var preview = document.getElementById('preview');
    var modeSelector = document.getElementById('mode');
    var mode = "none";
    var renderers = {
        none: function(tree, preview) {

        },
        dom: function(tree, preview) {
            var dom = creator.create(tree);
            removeChildren(preview);
            preview.appendChild(dom);
        },
        html: function(tree, preview) {
            var html = htmlRenderer.render(tree);
            preview.innerHTML = html;
        },
        diff: function(tree, preview) {
            var dom = creator.update(tree);
            if (!preview.contains(dom)) {
                removeChildren(preview);
                preview.appendChild(dom);
            }
        }
    };
    var render = function() {
        var tree = parser.parse(text.value);
        window.tree = tree;

        renderers[mode](tree, preview);
    };
    modeSelector.addEventListener('change', function() {
        mode = modeSelector.value;
        render();
    });
    text.addEventListener('keyup', render);
});
