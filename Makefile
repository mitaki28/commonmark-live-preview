NODE_MODULES=node_modules

BIN=node_modules/.bin/
BROWSERIFY=$(BIN)/browserify
NPM=npm

TARGET=index
SRC=$(TARGET).js

.PHONY: all

all: $(TARGET).browserify.js
$(TARGET).browserify.js: $(SRC) $(NODE_MODULES)
	$(BROWSERIFY) $(TARGET).js -o $@

$(NODE_MODULES):
	$(NPM) install	
