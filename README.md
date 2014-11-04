# Spawnify

Create new processes, change directories, auto switch between spawn and exec.

## Install

```
npm i spawnify --save
```

## How to use?

```js
var spawnify = require('spawnify');
    spawn   = spawnify('ls -lha', {cwd: __dirname});

spawn.on('error', function(error) {
    console.log(error);
});

spawn.on('data', function(data) {
    console.log(data);
});

spawn.on('path', function(path) {
    console.log('directory was changed', path);
});

spawn.on('close', function() {
    console.log('process closed');
});

```

## License

MIT
