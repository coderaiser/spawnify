#!/usr/bin/env node

'use strict';

let spawn;
const spawnify = require('../');
const argv = process.argv.slice(2);
const command = argv.join(' ');

if (!command) {
    console.log('spawnify <command>');
} else {
    spawn = spawnify(command);
    spawn.on('data', (data) => {
        console.log(data);
    });
    
    spawn.on('error', (error) => {
        console.error(error.message);
    });
    
    spawn.on('close', () => {
        console.log('closed');
        spawn = null;
    });
}
