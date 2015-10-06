NODE_MODULES=node_modules
BOWER_COMPONENTS=bower_components

BIN=node_modules/.bin/
BROWSERIFY=$(BIN)/browserify
NPM=npm
BOWER=$(BIN)/bower


TARGET=index
SRC=$(TARGET).js

.PHONY: all

all: $(TARGET).browserify.js
$(TARGET).browserify.js: $(SRC) $(BOWER_COMPONENTS) $(NODE_MODULES)
	$(BROWSERIFY) $(TARGET).js -o $@

$(BOWER_COMPOENTS):
	$(BOWER) install

$(NODE_MODULES):
	$(NPM) install	
