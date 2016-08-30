var spawn = require("child_process").spawn,
    phantomjs = require('phantomjs-prebuilt');
var pjsPath = phantomjs.path;

var childProcess = spawn( pjsPath, ['runner.js', 't/test.html'] );


childProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
});

childProcess.stderr.on('data', (data) => {
      console.log(`stderr: ${data}`);
});

childProcess.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
});
