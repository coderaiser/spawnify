# Spawnify

Create new process in node.

## Install

```
npm i spawnify --save
```

## How to use?

```js
var spawnify = require('spawnify');

spawnify('ls -lha', {cwd: __dirname}, function(json) {
    console.log(json.stdout, json.stderr, json.path);
});
```

## License

MIT
