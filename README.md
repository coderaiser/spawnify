# Spawnify

Create new process in node.

## Install

```
npm i spawnify --save
```

## How to use?

```js
var spawnify = require('spawnify');

spawnify('ls -lha', {cwd: __dirname}, function(error, json) {
    var stdout  = json.stdout,
        stderr  = json.stderr,
        path    = json.path;
    
    console.log(error, stdout, stderr, path);
});
```

## License

MIT
