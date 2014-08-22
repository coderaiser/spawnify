# Spawnify

Create new process in node.

## Install

```
npm i readify --save
```

## How to use?

```js
var spawnify = require('spawnify');

spawnify('ls -lha', {cwd: __dirname}, function(error, stdout, stderr) {
    console.log(error, stdout, stderr);
});
```

## License

MIT
