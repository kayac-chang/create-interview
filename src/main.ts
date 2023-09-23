import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";
import { red, reset } from "kolorist";
import { pipeWith } from "pipe-ts";

function formatTargetDir(targetDir: string) {
  return targetDir.trim().replace(/\/+$/g, "");
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(
    projectName
  );
}

function getProjectName(targetDir: string) {
  return targetDir === "." ? path.basename(path.resolve()) : targetDir;
}

function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z\d\-~]+/g, "-");
}

function emptyDir(dir: string) {
  for (const file of fs.readdirSync(dir)) {
    if (file === ".git") {
      continue;
    }
    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true });
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file);
    const destFile = path.resolve(destDir, file);
    copy(srcFile, destFile);
  }
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.copyFileSync(src, dest);
  }
}

const RENAME_FILES: Record<string, string | undefined> = {
  _gitignore: ".gitignore",
};

const EXAMS_DIR = path.resolve(
  fileURLToPath(import.meta.url),
  "../..",
  `exams`
  //
);

const EXAMS = fs
  .readdirSync(EXAMS_DIR)
  .map((dir) => ({ title: dir, value: path.resolve(EXAMS_DIR, dir) }));

const cwd = process.cwd();

interface Args {
  projectName: string;
  overwrite: boolean;
  overwriteChecker: boolean;
  packageName: string;
  exam: string;
}

async function init() {
  const result = await prompts<keyof Args>(
    [
      // get project name
      {
        type: "text",
        name: "projectName",
        message: reset("Project name:"),
        initial: "fe-interview",
      },
      {
        // if targetDir is not empty, ask for overwrite
        type: (projectName: string) =>
          pipeWith(projectName, formatTargetDir, (targetDir) => {
            if (fs.existsSync(targetDir) && isEmpty(targetDir))
              return "confirm";
            return null;
          }),
        name: "overwrite",
        message: (projectName: string) =>
          pipeWith(
            projectName,
            formatTargetDir,
            (targetDir) =>
              targetDir === "."
                ? "Current directory"
                : `Target directory "${targetDir}"`,
            (dir) => `${dir} is not empty. Remove existing files and continue?`
          ),
      },
      {
        // if overwrite is false, cancel the process
        type: (overwrite: boolean) => {
          if (overwrite === false) {
            throw new Error(red("✖") + " Operation cancelled");
          }
          return null;
        },
        name: "overwriteChecker",
      },
      {
        // get package name
        type: (_, values) =>
          pipeWith(
            values.projectName as string,
            formatTargetDir,
            getProjectName,
            isValidPackageName,
            (valid) => (valid ? null : "text")
          ),
        name: "packageName",
        message: reset("Package name:"),
        initial: (_, values) =>
          pipeWith(
            values.projectName as string,
            formatTargetDir,
            getProjectName,
            toValidPackageName
          ),
        validate: (dir) =>
          isValidPackageName(dir) || "Invalid package.json name",
      },
      {
        type: "select",
        name: "exam",
        message: reset("Select a exam:"),
        initial: 0,
        choices: EXAMS,
      },
    ],
    {
      onCancel: () => {
        throw new Error(red("✖") + " Operation cancelled");
      },
    }
  );

  const props = result as Args;

  // check if project folder exists
  const root = path.join(cwd, formatTargetDir(props.projectName));
  if (props.overwrite) {
    emptyDir(root);
  } else {
    fs.mkdirSync(root, { recursive: true });
  }

  // determine exam
  const examDir = props.exam;
  console.log(`\nScaffolding project in ${root}...`);

  // copy exam
  const files = fs.readdirSync(examDir);
  files
    .filter((f) => f !== "package.json")
    .forEach((file) =>
      copy(
        // src
        path.join(examDir, file),
        // dest
        path.join(root, RENAME_FILES[file] ?? file)
      )
    );

  pipeWith(
    path.join(examDir, "package.json"),
    (path) => fs.readFileSync(path, "utf-8"),
    JSON.parse,
    (pkg) => ({ ...pkg, name: props.packageName }),
    (pkg) => JSON.stringify(pkg, null, 2) + "\n",
    (content) => fs.writeFileSync(path.join(root, "package.json"), content)
  );

  console.log(`\nDone.\n`);
  const cdProjectName = path.relative(cwd, root);
  console.log(
    `cd ${cdProjectName.includes(" ") ? `"${cdProjectName}"` : cdProjectName}`
  );
  console.log("and start coding\n");
  console.log();
}
init();
