.PHONY: all check schemas clean

all: schemas

schemas:
	glib-compile-schemas .

check:
	gjs -C '' --coverage-output=coverage -I . test/testTimeLog.js
	genhtml coverage/coverage.lcov -o coverage_html

clean:
	rm -fr coverage
	rm -fr coverage_html

