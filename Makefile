BIN=node_modules/.bin/
BROWSERIFY=$(BIN)/browserify
TARGET=index
SRC=$(TARGET).js

.PHONY: all

all: $(TARGET).browserify.js
$(TARGET).browserify.js: $(SRC)
	$(BROWSERIFY) $(TARGET).js -o $@
