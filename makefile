.PHONY: all clean

all:
	glib-compile-schemas .

clean:
	rm gschemas.compiled
