.PHONY: help install build dev test check clean

help:
	@echo "MarkLeaf commands"
	@echo ""
	@echo "  make install   Install npm dependencies"
	@echo "  make build     Bundle the renderer"
	@echo "  make dev       Run the Electron desktop app"
	@echo "  make test      Run unit tests"
	@echo "  make check     Run tests and Electron syntax checks"
	@echo "  make clean     Remove local dependency/build output"

install:
	npm install

build:
	npm run build:renderer

dev:
	npm run dev

test:
	npm test

check:
	npm test
	npm run build:renderer
	node --check electron/main.cjs
	node --check electron/preload.cjs
	node --check scripts/build-renderer.cjs
	node --check scripts/start-electron.cjs

clean:
	rm -rf node_modules dist out release
