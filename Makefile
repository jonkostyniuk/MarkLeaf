.PHONY: help install build build-mac-icon dev package-mac test check clean

help:
	@echo "MarkLeaf commands"
	@echo ""
	@echo "  make install   Install npm dependencies"
	@echo "  make build     Bundle the renderer"
	@echo "  make build-mac-icon Generate the macOS .icns app icon"
	@echo "  make dev       Run the Electron desktop app"
	@echo "  make package-mac Build an unsigned local macOS .app"
	@echo "  make test      Run unit tests"
	@echo "  make check     Run tests and Electron syntax checks"
	@echo "  make clean     Remove local dependency/build output"

install:
	npm install

build:
	npm run build:renderer

build-mac-icon:
	npm run build:mac-icon

dev:
	npm run dev

package-mac:
	npm run package:mac

test:
	npm test

check:
	npm test
	npm run build:renderer
	npm run build:mac-icon
	node --check electron/main.cjs
	node --check electron/preload.cjs
	node --check scripts/build-renderer.cjs
	node --check scripts/build-mac-icon.cjs
	node --check scripts/start-electron.cjs

clean:
	rm -rf node_modules build dist out release
