NODE_MODULES=node_modules/

BIN=$(NODE_MODULES)/.bin/

BROWSERIFY=$(BIN)/browserify
NPM=npm

TARGET=index
SRC=src/index.js
DIST=dist/index.browserify.js

.PHONY: all

all: $(DIST)
$(DIST): $(SRC) $(NODE_MODULES)
	$(BROWSERIFY) $(SRC) -o $@

$(NODE_MODULES):
	$(NPM) install
