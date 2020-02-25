# Spawnify [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

[NPMIMGURL]:                https://img.shields.io/npm/v/spawnify.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/spawnify/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/david/coderaiser/spawnify.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/spawnify "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/spawnify  "Build Status"
[DependencyStatusURL]:      https://david-dm.org/coderaiser/spawnify "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

Create new processes, change directories, auto switch between spawn and exec.

## Install

```
npm i spawnify --save
```

## How to use?

```js
const spawnify = require('spawnify');
const spawn = spawnify('ls -lha', {cwd: __dirname});

spawn.on('error', (error) => {
    console.error(error.message);
});

/* not mandatory */
spawn.on('data', (data) => {
    console.log(data);
});

/* not mandatory */
spawn.on('start', () => {
    console.log('process has been started');
    // kill process after start
    spawn.kill();
});

/* not mandatory */
spawn.on('path', (path) => {
    console.log('directory was changed', path);
});

/* not mandatory */
spawn.on('close', () => {
    console.log('process closed');
});

/* not mandatory */
spawn.on('exit', () => {
    console.log('process closed');
});
```

## License

MIT
