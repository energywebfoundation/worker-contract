const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const indexTemplatePath = path.join(__dirname, "build", "index.template.html");
const indexPath = path.join(__dirname, "build", "index.html");

if (!fs.existsSync(indexTemplatePath)) {
  // Create template from original index.html
  fs.copyFileSync(indexPath, indexTemplatePath);
}

// Restore original template
fs.copyFileSync(indexTemplatePath, indexPath);


// Substitute variables in index.html
exec(`envsubst < ${indexTemplatePath} > ${indexPath}`);