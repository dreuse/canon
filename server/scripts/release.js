/* oxlint-disable @typescript-eslint/no-var-requires */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { exit } = require("process");
const readline = require("readline");
const semver = require("semver");

const input = process.argv.slice(2);

if (input.length === 0) {
  console.log("Usage: yarn release (major|minor|patch|1.2.3)");
  exit(1);
}

const root = path.resolve(__dirname, "..", "..");
const opts = {
  cwd: root,
  stdio: "inherit",
};

// Read current package.json
const packagePath = path.resolve(root, "package.json");
const packageJson = require(packagePath);
const currentVersion = packageJson.version;

// Calculate new version based on input
let newVersion;
const versionType = input[0].toLowerCase();

if (
  versionType === "major" ||
  versionType === "minor" ||
  versionType === "patch"
) {
  newVersion = semver.inc(currentVersion, versionType);
} else if (semver.valid(versionType)) {
  newVersion = versionType;
} else {
  console.log(
    "Error: Invalid version type. Use major, minor, patch, or a specific version like 1.2.3"
  );
  exit(1);
}

console.log(`\nCurrent version: ${currentVersion}`);
console.log(`New version: ${newVersion}\n`);

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Do you want to proceed with this release? (Y/n): ", (answer) => {
  rl.close();

  const response = answer.trim().toLowerCase();
  if (response === "n" || response === "no") {
    console.log("Release cancelled.");
    exit(0);
  }

  try {
    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log("Updated package.json");

    // Git operations
    execSync(`git add package.json`, opts);
    execSync(
      `git commit -m "chore(release): bump version to ${newVersion}" --no-verify`,
      opts
    );
    execSync(`git tag v${newVersion} -m v${newVersion}`, opts);
    execSync(`git push origin main`, opts);
    execSync(`git push origin v${newVersion}`, opts);

    console.log(`\nReleased v${newVersion} 🚀`);
  } catch (err) {
    console.log("Error during release:", err.message);
    exit(1);
  }
});
