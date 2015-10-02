BROWSERIFY=node_modules/.bin/browserify
TARGET=index.browserify.js
INDEX=index.js
SRC=$(wildcard lib/*.js) $(INDEX)

all: index.browserify.js
index.browserify.js: $(SRC)
	$(BROWSERIFY) $(INDEX) -o $@ 
