const { exec } = require("child_process");

exec("cp ./build/index.html ./build/index.template.html");
exec("envsubst < ./build/index.template.html > ./build/index.html");