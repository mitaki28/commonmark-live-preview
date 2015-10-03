var cmark = require('commonmark');
var domCreators = require('./lib/dom');
var htmlrenderer = new cmark.HtmlRenderer;
var domCreator = new domCreators.SimpleCreator();
var diffrenderer = new domCreators.DiffCreator();
var parser = new cmark.Parser();

window.addEventListener('DOMContentLoaded', function() {
    var text = document.getElementById('text');
    var preview = document.getElementById('preview');
    var modeSelector = document.getElementById('mode');
    var mode = "dom";
    var renderers = {
	dom: function(tree, preview) {
	    console.time('render(internal)');
	    var dom = domCreator.create(tree);
	    console.timeEnd('render(internal)');
	    console.time('render(output)');
	    preview.innerHTML = '';
	    preview.appendChild(dom);
	    console.timeEnd('render(output)');
	},
	html: function(tree, preview) {
	    console.time('render(internal)');
	    var html = htmlrenderer.render(tree);
	    console.timeEnd('render(internal)');
	    console.time('render(output)');
	    preview.innerHTML = html;
	    console.timeEnd('render(output)');
	},
	diff: function(tree, preview) {
	    if (diffrenderer.tree == null) {
		var dom = diffrenderer.create(tree);
		preview.innerHTML = '';		
		preview.appendChild(dom);
	    } else {
		diffrenderer.create(tree);
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
