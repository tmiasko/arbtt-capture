.PHONY: all check schemas clean

all: schemas

schemas:
	glib-compile-schemas .

check:
	gjs -I . test/testArbtt.js

clean:

