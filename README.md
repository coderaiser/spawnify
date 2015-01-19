# Spawnify

Create new processes, change directories, auto switch between spawn and exec.

## Install

```
npm i spawnify --save
```

## How to use?

```js
var spawnify = require('spawnify'),
    spawn   = spawnify('ls -lha', {cwd: __dirname});

spawn.on('error', function(error) {
    console.log(error);
});

/* not mandatory */
spawn.on('data', function(data) {
    console.log(data);
});

/* not mandatory */
spawn.on('start', function() {
    console.log('process has been started', path);
    // kill process after start
    spawn.kill();
});

/* not mandatory */
spawn.on('path', function(path) {
    console.log('directory was changed', path);
});

/* not mandatory */
spawn.on('close', function() {
    console.log('process closed');
});

/* not mandatory */
spawn.on('exit', function() {
    console.log('process closed');
});

```

## License

MIT
