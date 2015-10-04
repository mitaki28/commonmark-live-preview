var cmark = require('commonmark');
var hljs = require('highlight.js');
var DomCreator = require('../');
var htmlRenderer = new cmark.HtmlRenderer;
var creator = new DomCreator();
var parser = new cmark.Parser();

creator.onUpdate['CodeBlock'] = (node) => {
    var info_words = node.info ? node.info.split(/\s+/) : [];
    if (info_words.length > 0 && info_words[0].length > 0) {
	node.dom.innerHTML = hljs.highlight(info_words[0], node.literal).value;	
    } else {
	node.dom.innerHTML = hljs.highlightAuto(node.literal).value;
    }
};

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
	    console.time('render(internal)');
	    var dom = creator.create(tree);
	    console.timeEnd('render(internal)');
	    console.time('render(output)');
	    removeChildren(preview);
	    preview.appendChild(dom);
	    console.timeEnd('render(output)');
	},
	html: function(tree, preview) {
	    console.time('render(internal)');
	    var html = htmlRenderer.render(tree);
	    console.timeEnd('render(internal)');
	    console.time('render(output)');
	    preview.innerHTML = html;
	    console.timeEnd('render(output)');
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
	console.log('rendering mode', mode);
	console.time('parse');
	var tree = parser.parse(text.value);
	window.tree = tree;
	console.timeEnd('parse');
	
	console.time('render');
	renderers[mode](tree, preview);
	console.timeEnd('render');
    };
    modeSelector.addEventListener('change', function() {
	mode = modeSelector.value;
	render();
    });
    text.addEventListener('keyup', render);
});
