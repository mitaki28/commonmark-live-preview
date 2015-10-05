BIN=node_modules/.bin/
BROWSERIFY=$(BIN)/browserify
MINIFY=$(BIN)/uglifyjs
MINIFY_FLAGS=-m -c
TARGET=example/index
SRC=$(wildcard lib/*.js) $(TARGET).js

.PHONY: all

all: $(TARGET).browserify.js
$(TARGET).browserify.js: $(SRC)
	$(BROWSERIFY) -t babelify $(TARGET).js -o $@
