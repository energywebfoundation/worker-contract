const { exec } = require("child_process");

// Restore template index
exec("cp ./build/index.template.html ./build/index.html ");

// Preserve original index.html
exec("cp ./build/index.html ./build/index.template.html");

// Substitute variables in index.html
exec("envsubst < ./build/index.template.html > ./build/index.html");