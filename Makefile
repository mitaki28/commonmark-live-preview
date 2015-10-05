BIN=node_modules/.bin/
BROWSERIFY=$(BIN)/browserify
TARGET=example/index
SRC=$(wildcard lib/*.js) $(TARGET).js

.PHONY: all

all: $(TARGET).browserify.js
$(TARGET).browserify.js: $(SRC)
	$(BROWSERIFY) -t babelify $(TARGET).js -o $@
