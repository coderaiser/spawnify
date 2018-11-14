'use strict';

const path = require('path');
const {EventEmitter} = require('events');
const util = require('util');
const assert = require('assert');
const {exec, spawn} = require('child_process');

const tryCatch = require('try-catch');
const tildify = require('tildify');
const untildify = require('untildify');

const WIN = process.platform === 'win32';

const find = require('glob');
const win = require('win32');

const newLine = (error) => {
    error.message += '\n';
    return error;
};

util.inherits(Spawnify, EventEmitter);
win.prepareCodePage();

module.exports = (command, options) => {
    options = options || {};
    
    assert(command, 'command could not be empty!');
    
    const isCWD = options.cwd;
    const cwd = isCWD ? untildify(options.cwd) : process.cwd();
    
    return new Spawnify(command, {
        ...options,
        cwd,
    });
};

function Spawnify(command, options) {
    EventEmitter.call(this);
    
    process.nextTick(() => {
        this._onMessage(command, options);
    });
}

Spawnify.prototype._onMessage = function onMessage(command, options) {
    const dir = options.cwd;
    const isVolume = win.isChangeVolume(command);
    
    const regExpCD = /^cd ?/;
    const regExpCDWin = /^cd ?/i;
    
    const isCD = regExpCD.test(command);
    const isCDWin = regExpCDWin.test(command);
    
    const symbolsExec = [
        '~', '>', '<', '#',
        '*', '&', '{', '}',
        '|', '\'','"', ';',
        '`', '$'
    ];
    
    const isSymbol = isContain(command, symbolsExec);
    
    assert(command, 'command could not be empty!');
    assert(command, 'options could not be empty!');
    
    if (isCD || isCDWin && WIN || isVolume) {
        command = command
            .replace(WIN ? regExpCDWin : regExpCD, '');
        
        this._onCD(command || '~', dir);
    } else {
        if (WIN)
            command = 'cmd /C ' + command;
        
        const firstChar = command[0];
        
        if (firstChar === ' ' || isSymbol)
            this._set('exec', command, options);
        else
            this._set('spawn', command, options);
    }
};

Spawnify.prototype._emit = function emit(event, data) {
    const count = (event) => {
        const listeners = this.listeners(event);
        
        return listeners.length;
    };
    
    assert(event, 'event could not be empty!');
    
    if (count(event) || event === 'error') {
        this.emit(event, data);
        
        /* 
         * when code is EACESS
         * close and exit events
         * whould not be emitted
         */
        if (event === 'error' && data.code === 'EACCES') {
            if (count('close'))
                this.emit('close');
            
            if (count('exit'))
                this.emit('exit');
        }
    }
};

Spawnify.prototype._set = function set(type, command, options) {
    let args, error, child;
    let result;
    
    assert(type, 'event could not be empty!');
    assert(command, 'command could not be empty!');
    assert(options, 'options could not be empty!');
    
    options.encoding = 'buffer';
    
    switch(type) {
    default:
        throw Error('type could be exec or spawn only!');
    
    case 'exec':
        result = tryCatch(exec, command, options);
        
        error = result[0];
        child = result[1];
        break;
    
    case 'spawn':
        args = command.split(' ');
        command = args.shift();
        
        result = tryCatch(spawn, command, args, options);
        
        error = result[0];
        child = result[1];
        break;
    }
    
    if (error) {
        if (error.code === 'ENOTDIR')
            error.message += ': ' + options.cwd;
        
        this._emit('error', newLine(error));
        this._emit('close');
        this._emit('exit');
    } else {
        /*
         * would be null
         * when options.stdio: 'inherit' used
         */
        this._setListeners(child);
        
        this.on('kill', (code) => {
            child.kill(code);
        });
        
        this.on('write', (data) => {
            child.stdin.write(data);
        });
        
        this._emit('start');
    }
};

Spawnify.prototype.kill = function(code) {
    this._emit('kill', code);
};

Spawnify.prototype.write = function(data) {
    this._emit('write', data);
};

Spawnify.prototype._setListeners = function setListeners(child) {
    assert(child, 'child could not be empty!');
    
    /*
     * would be null
     * when options.stdio: 'inherit' used
     */
    if (child.stdin)
        child.stdin.on('error', (error) => {
            this._emit('error', newLine(error));
        });
   
    if (child.stdout) {
        child.stdout
            .pipe(win.unicodify())
            .setEncoding('utf8')
            .on('data', (data) => {
                this._emit('data', data);
            });
         
        child.stdout.on('error', (error) => {
            this._emit('error', newLine(error));
        });
    }
   
    if (child.stderr) {
        child.stderr.pipe(win.unicodify())
            .setEncoding('utf8')
            .on('data', (error) => {
                this._emit('error', Error(error));
            });
        
        child.stderr.on('error', (error) => {
            this._emit('error', newLine(error));
        });
    }
    
    child.on('error', (error) => {
        this._emit('error', newLine(error));
    });
    
    child.on('exit', () => {
        child = null;
        this._emit('exit');
    });
    
    child.on('close', () => {
        child = null;
        this._emit('close');
    });
};

Spawnify.prototype._onCD = function onCD(command, currDir) {
    let wasError;
    
    const CD = 'cd ';
    const isChangeVolume = win.isChangeVolume(command);
    const isVolume = win.isVolume(command);
    const regExpRoot = RegExp('^[/\\\\]');
    
    this.on('error', () => {
        wasError = true;
    });
    
    this.on('close', () => {
        if (!wasError)
            this._emit('path', tildify(paramDir));
    });
    
    let paramDir = untildify(command);
    const isWildCard = isContain(paramDir, ['*', '?']);
    
    if (!paramDir && !WIN)
        paramDir = '.';
    
    if (!isChangeVolume || isVolume) {
        paramDir = this._getFirstWord(paramDir);
        paramDir = path.normalize(paramDir);
        
        const isRoot = regExpRoot.test(paramDir);
        
        const strs = [
            CD,
            paramDir,
            '\'' + paramDir + '\'',
            '"'  + paramDir + '"',
        ];
        
        strs.forEach((str) => {
            command = command.replace(str, '');
        });
        
        if (!isRoot)
            paramDir    = path.join(currDir, paramDir);
        
        if (isWildCard)
            command = CD + paramDir + ' ' + command;
        else
            command = CD + '"' + paramDir + '" ' + command;
    }
    
    if (!isWildCard)
        return this._set('exec', command, {cwd: paramDir});
    
    find(paramDir, (error, dirs) => {
        let cwd;
        
        if (!error)
            cwd = dirs[0];
        
        this._set('exec', command, {
            cwd
        });
    });
};

Spawnify.prototype._getFirstWord = function getFirstWord(str) {
    const regStrEnd = getRegStrEnd();
    const regStr = '^(.*?)';
    const regStrQuotes = '^"(.*)"';
    const regExp = RegExp(regStr + regStrEnd);
    const regExpQuotes = RegExp(regStrQuotes + regStrEnd + '?');
    const is = typeof str === 'string';
    
    if (!is)
        return str;
    
    let result  = str.match(regExpQuotes);
    
    if (result)
        return result[1] || str;
    
    result = str.match(regExp);
    return result && result[1] || str;
};

function getRegStrEnd() {
    const chars = ['s', ';', '&&', '\\', '|'];
    const escaped = chars
        .map((char) => {
            return '\\' + char;
        }).join('|');
    
    const regStr = '(' + escaped + ')';
    
    return regStr;
}

function isContain(str, symbols) {
    assert(str, 'str could not be empty!');
    assert(symbols, 'symbols could not be empty!');
    
    return symbols.some((symbol) => {
        return ~str.indexOf(symbol);
    });
}

