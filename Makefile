BROWSERIFY=node_modules/.bin/browserify
MINIFY=node_modules/.bin/uglifyjs
MINIFY_FLAGS=-m -c
TARGET=example/index
SRC=$(wildcard lib/*.js) $(TARGET).js

.PHONY: all

all: $(TARGET).browserify.js
$(TARGET).browserify.js: $(SRC)
	$(BROWSERIFY) $(TARGET).js -o $@ 
