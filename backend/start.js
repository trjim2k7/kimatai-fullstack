const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
console.log('Starting server at:', serverPath);

const server = spawn('node', [serverPath], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});