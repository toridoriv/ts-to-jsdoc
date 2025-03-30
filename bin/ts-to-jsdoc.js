"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arg_1 = __importDefault(require("arg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const index_1 = require("../index");
const { "--out": out, "--project": project, "--ignore": ignore, "--force": force, "--help": help, _, } = (0, arg_1.default)({
    "--out": String,
    "-o": "--out",
    "--output": "--out",
    "--project": String,
    "-p": "--project",
    "--ignore": [String],
    "-i": "--ignore",
    "--force": Boolean,
    "-f": "--force",
    "--help": Boolean,
    "-h": "--help",
});
const args = {
    out, project, ignore, force, help, _,
};
const helpMessage = `
Usage:
  ts-to-jsdoc [options] <path>...
  ts-to-jsdoc -p path/to/tsconfig.json

Options:
  -h --help          Shows this.
  -p --project       Path to tsconfig.json.
  -o --out --output  Directory to output transpiled JavaScript. [default: source path, ignored if project is set]
  -i --ignore        File or directory paths to ignore when transpiling. [ignored if project is set]
  -f --force         Overwrite existing output files. [ignored if project is set]
`;
if (args.help || Object.keys(args).every((arg) => !args[arg]?.length)) {
    console.log(helpMessage);
    process.exit(0);
}
if (args.out) {
    args.out = makePathAbsolute(args.out);
    if (fs_1.default.existsSync(args.out)) {
        if (!args.force) {
            console.error(error(`Output directory exists: ${args.out}`));
            process.exit(1);
        }
    }
    else {
        fs_1.default.mkdirSync(args.out);
    }
}
if (args.project) {
    args.project = makePathAbsolute(args.project);
    if (!fs_1.default.existsSync(args.project)) {
        console.error(error(`tsconfig.json does not exist: ${args.project}`));
        process.exit(1);
    }
    try {
        (0, index_1.transpileProject)(args.project, true);
        process.exit();
    }
    catch (e) {
        console.error(error(e.message));
        process.exit(1);
    }
}
args.ignore = args.ignore?.length ? normalizePaths(args.ignore) : [];
const paths = replaceDirectoriesWithFiles([...new Set(normalizePaths(args._))])
    .filter((filepath) => (path_1.default.extname(filepath) === ".ts" && !filepath.endsWith(".d.ts"))
    || path_1.default.extname(filepath) === ".tsx")
    .filter((filepath) => !args.ignore.some((ignoredPath) => filepath === ignoredPath || pathIsInside(filepath, ignoredPath)));
for (const filepath of paths) {
    const extension = path_1.default.extname(filepath);
    const outPath = path_1.default.join(args.out ?? path_1.default.dirname(filepath), `${path_1.default.basename(filepath, extension)}.js`);
    if (fs_1.default.existsSync(outPath) && !args.force) {
        console.warn(warning(`Cannot write to ${outPath}; file already exists.`));
        continue;
    }
    const code = fs_1.default.readFileSync(filepath, "utf8");
    const transpiled = (0, index_1.transpileFile)({
        code, filename: filepath, debug: true,
    });
    fs_1.default.writeFileSync(outPath, transpiled);
}
function warning(message) {
    return `\u001B[93m[WARN]\u001B[39m ${message}`;
}
function error(message) {
    return `\u001B[91m[ERROR]\u001B[39m ${message}`;
}
function makePathAbsolute(filepath) {
    return path_1.default.isAbsolute(filepath)
        ? filepath
        : path_1.default.resolve(process.cwd(), filepath);
}
/**
 * Makes paths absolute, filtering those that exist
 * @return An array containing absolute paths that do exist
 * @param pathsToNormalize
 */
function normalizePaths(pathsToNormalize) {
    return pathsToNormalize
        .map(makePathAbsolute)
        .filter((filepath) => {
        if (!fs_1.default.existsSync(filepath)) {
            console.warn(warning(`File or directory ${filepath} does not exist.`));
            return false;
        }
        return true;
    });
}
/**
 * Given an array of paths, recursively removes all
 * directories and appends all files within said directories to the array
 * @param pathList An array of paths
 * @return An array containing only files, replacing directories with their contents
 */
function replaceDirectoriesWithFiles(pathList) {
    let pathArray = [...pathList];
    for (const [index, filepath] of pathArray.entries()) {
        if (fs_1.default.existsSync(filepath) && fs_1.default.lstatSync(filepath).isDirectory()) {
            pathArray.splice(index, 1);
            pathArray = pathArray
                .concat(replaceDirectoriesWithFiles(fs_1.default.readdirSync(filepath).map((file) => path_1.default.join(filepath, file))));
        }
    }
    return pathArray;
}
/* eslint-disable */
/**
 * @license WTFPL
 * Copyright © 2013–2016 Domenic Denicola <d@domenic.me>
 */
function pathIsInside(thePath, potentialParent) {
    // For inside-directory checking, we want to allow trailing slashes, so normalize.
    thePath = stripTrailingSep(thePath);
    potentialParent = stripTrailingSep(potentialParent);
    // Node treats only Windows as case-insensitive in its path module; we follow those conventions.
    if (process.platform === "win32") {
        thePath = thePath.toLowerCase();
        potentialParent = potentialParent.toLowerCase();
    }
    return thePath.lastIndexOf(potentialParent, 0) === 0
        && (thePath[potentialParent.length] === path_1.default.sep
            || thePath[potentialParent.length] === undefined);
}
/**
 * @license WTFPL
 * Copyright © 2013–2016 Domenic Denicola <d@domenic.me>
 */
function stripTrailingSep(thePath) {
    if (thePath[thePath.length - 1] === path_1.default.sep) {
        return thePath.slice(0, -1);
    }
    return thePath;
}
