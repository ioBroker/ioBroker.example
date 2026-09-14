/*
 * Build the Vite-based admin UI and copy it into the adapter's admin directory.
 */
import fs from "node:fs";
import { buildReact, copyFiles, deleteFoldersRecursive, npmInstall } from "@iobroker/build-tools";

const SRC = "src-admin";

const SOCKET_IO_LOADER =
	/<script>\s*(?:var|const|let)\s+script\s*=\s*document\.createElement\(["']script["']\)[\s\S]*?<\/script>/;

function copyAllFiles(): void {
	deleteFoldersRecursive("admin", [".png", ".json", "i18n"]);
	// "build/*" matches all files recursively; "build/**/*" would skip the HTML files in the build root
	copyFiles([`${SRC}/build/*`, `!${SRC}/build/**/*.map`], "admin");
}

function clean(): void {
	deleteFoldersRecursive("admin", [".png", ".json", "i18n"]);
	deleteFoldersRecursive(`${SRC}/build`);
}

function patchFiles(): void {
	for (const file of [
		"admin/index_m.html",
		"admin/tab_m.html",
		`${SRC}/build/index_m.html`,
		`${SRC}/build/tab_m.html`,
	]) {
		if (fs.existsSync(file)) {
			const code = fs.readFileSync(file, "utf8");
			fs.writeFileSync(
				file,
				code.replace(
					SOCKET_IO_LOADER,
					'<script type="text/javascript" src="./../../lib/js/socket.io.js"></script>',
				),
			);
		}
	}
}

if (process.argv.includes("--0-clean")) {
	clean();
} else if (process.argv.includes("--1-npm")) {
	void npmInstall(`${import.meta.dirname.replace(/\\/g, "/")}/${SRC}/`);
} else if (process.argv.includes("--2-build")) {
	void buildReact(`${import.meta.dirname}/${SRC}`, { rootDir: import.meta.dirname, vite: true });
} else if (process.argv.includes("--3-copy")) {
	copyAllFiles();
} else if (process.argv.includes("--4-patch")) {
	patchFiles();
} else {
	clean();
	void Promise.resolve()
		.then(() =>
			fs.existsSync(`${SRC}/node_modules`)
				? undefined
				: npmInstall(`${import.meta.dirname.replace(/\\/g, "/")}/${SRC}/`),
		)
		.then(() => buildReact(`${import.meta.dirname}/${SRC}`, { rootDir: import.meta.dirname, vite: true }))
		.then(copyAllFiles)
		.then(patchFiles);
}
