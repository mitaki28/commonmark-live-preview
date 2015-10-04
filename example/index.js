var cmark = require('commonmark');
var domCreators = require('../');
var htmlRenderer = new cmark.HtmlRenderer;
var domCreator = new domCreators.SimpleCreator();
var diffCreator = new domCreators.DiffCreator();
var parser = new cmark.Parser();

function removeChildren(dom) {
    while (dom.lastChild) dom.removeChild(dom.lastChild);
}

window.addEventListener('DOMContentLoaded', function() {
    var text = document.getElementById('text');
    var preview = document.getElementById('preview');
    var modeSelector = document.getElementById('mode');
    var mode = "dom";
    var renderers = {
	none: function(tree, preview) {

	},
	dom: function(tree, preview) {
	    console.time('render(internal)');
	    var dom = domCreator.create(tree);
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
	    var dom = diffCreator.create(tree);
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
