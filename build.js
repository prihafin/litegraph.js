const fs = require('fs');
const cp = require('child_process');

fs.copyFileSync('grunt/gruntfile-main.js', 'gruntfile.js');
cp.execSync('grunt', {stdio:'inherit'});

fs.copyFileSync('grunt/gruntfile-nodes.js', 'gruntfile.js');
cp.execSync('grunt', {stdio:'inherit'});

fs.unlinkSync('gruntfile.js');