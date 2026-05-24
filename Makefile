.PHONY: help install dev web test check clean

help:
	@echo "MarkLeaf commands"
	@echo ""
	@echo "  make install   Install npm dependencies"
	@echo "  make dev       Run the Electron desktop app"
	@echo "  make web       Run the browser fallback prototype on port 4173"
	@echo "  make test      Run unit tests"
	@echo "  make check     Run tests and Electron syntax checks"
	@echo "  make clean     Remove local dependency/build output"

install:
	npm install

dev:
	npm run dev

web:
	npm run dev:web

test:
	npm test

check:
	npm test
	node --check electron/main.cjs
	node --check electron/preload.cjs

clean:
	rm -rf node_modules dist out release
