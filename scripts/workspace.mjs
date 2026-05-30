import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(rootDir, "workspace.config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const [, , command, ...args] = process.argv;

function printUsage() {
  console.log(`Cloud-Maven workspace runner

Usage:
  node scripts/workspace.mjs list
  node scripts/workspace.mjs run <project> <script> [-- script args]
  node scripts/workspace.mjs task <task> [-- script args]
`);
}

async function readPackageScripts(project) {
  const packagePath = resolve(rootDir, project.path, "package.json");
  const pkg = JSON.parse(await readFile(packagePath, "utf8"));
  return Object.keys(pkg.scripts ?? {});
}

async function listWorkspace() {
  console.log("Projects:");

  for (const [name, project] of Object.entries(config.projects)) {
    const scripts = await readPackageScripts(project);
    console.log(`  ${name.padEnd(8)} ${project.path} - ${project.description}`);
    console.log(`           scripts: ${scripts.join(", ") || "none"}`);
  }

  console.log("\nTasks:");
  for (const [name, task] of Object.entries(config.tasks)) {
    const mode = task.parallel ? "parallel" : "serial";
    const steps = task.steps.map((step) => `${step.project}:${step.script}`).join(", ");
    console.log(`  ${name.padEnd(8)} ${mode} - ${steps}`);
  }

  if (config.documents) {
    console.log("\nDocuments:");
    for (const [name, document] of Object.entries(config.documents)) {
      console.log(`  ${name.padEnd(10)} ${document.path} - ${document.description}`);
    }
  }
}

function splitForwardedArgs(values) {
  const separatorIndex = values.indexOf("--");

  if (separatorIndex === -1) {
    return [values, []];
  }

  return [values.slice(0, separatorIndex), values.slice(separatorIndex + 1)];
}

function createPrefixedWriter(label, stream) {
  let buffered = "";

  const write = (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length > 0) {
        stream.write(`[${label}] ${line}\n`);
      }
    }
  };

  write.flush = () => {
    if (buffered.length > 0) {
      stream.write(`[${label}] ${buffered}\n`);
      buffered = "";
    }
  };

  return write;
}

function runStep(step, forwardedArgs = []) {
  const project = config.projects[step.project];

  if (!project) {
    throw new Error(`Unknown project: ${step.project}`);
  }

  const projectDir = resolve(rootDir, project.path);
  const label = `${step.project}:${step.script}`;
  const cmdParts = [npmCommand, "run", step.script];

  if (forwardedArgs.length > 0) {
    cmdParts.push("--", ...forwardedArgs);
  }

  const child = spawn(cmdParts.join(" "), [], {
    cwd: projectDir,
    env: process.env,
    shell: true,
    stdio: ["inherit", "pipe", "pipe"]
  });

  const stdout = createPrefixedWriter(label, process.stdout);
  const stderr = createPrefixedWriter(label, process.stderr);

  child.stdout.on("data", stdout);
  child.stderr.on("data", stderr);

  return {
    child,
    done: new Promise((resolveDone, rejectDone) => {
      child.on("error", rejectDone);
      child.on("close", (code, signal) => {
        stdout.flush();
        stderr.flush();

        if (code === 0) {
          resolveDone();
          return;
        }

        const suffix = signal ? `signal ${signal}` : `exit code ${code}`;
        rejectDone(new Error(`${label} failed with ${suffix}`));
      });
    })
  };
}

async function runSerial(steps, forwardedArgs) {
  for (const step of steps) {
    await runStep(step, forwardedArgs).done;
  }
}

async function runParallel(steps, forwardedArgs) {
  const running = steps.map((step) => runStep(step, forwardedArgs));

  const stopAll = () => {
    for (const entry of running) {
      if (!entry.child.killed) {
        entry.child.kill();
      }
    }
  };

  process.once("SIGINT", () => {
    stopAll();
    process.exit(130);
  });

  process.once("SIGTERM", () => {
    stopAll();
    process.exit(143);
  });

  try {
    await Promise.all(running.map((entry) => entry.done));
  } catch (error) {
    stopAll();
    throw error;
  }
}

async function runProjectScript(values) {
  const [[projectName, scriptName], forwardedArgs] = splitForwardedArgs(values);

  if (!projectName || !scriptName) {
    printUsage();
    process.exit(1);
  }

  await runStep({ project: projectName, script: scriptName }, forwardedArgs).done;
}

async function runTask(values) {
  const [[taskName], forwardedArgs] = splitForwardedArgs(values);
  const task = config.tasks[taskName];

  if (!task) {
    throw new Error(`Unknown task: ${taskName}`);
  }

  if (task.parallel) {
    await runParallel(task.steps, forwardedArgs);
    return;
  }

  await runSerial(task.steps, forwardedArgs);
}

try {
  if (command === "list") {
    await listWorkspace();
  } else if (command === "run") {
    await runProjectScript(args);
  } else if (command === "task") {
    await runTask(args);
  } else {
    printUsage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
