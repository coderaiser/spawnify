(function() {
    'use strict';
    
    var path            = require('path'),
        child_process   = require('child_process'),
        
        exec            = child_process.exec,
        
        WIN             = process.platform === 'win32',
        spawn           = child_process.spawn,
        
        Util            = require('util-io'),
        find            = require('glob'),
        win             = require('win32'),
        
        addNewLine      = function (text) {
            var newLine     = '',
                n           = text && text.length;
            
            if (n && text[n-1] !== '\n')
                newLine = '\n';
            
            return text + newLine;
        };
        
    win.prepareCodePage();
    
    module.exports = function(command, options, callback) {
        Util.checkArgs(arguments, ['command', 'callback']);
        
        if (!callback) {
            callback    = options;
            
            options     = {
                cwd: process.cwd()
            };
        }
        
        onMessage(command, options, callback);
    };
    
    function onMessage(command, options, callback) {
        var firstChar,
            ret,
            dir         = options.cwd,
            isVolume    = win.isChangeVolume(command),
            isCD        = /^cd ?/.test(command),
            isCDWin     = /^cd ?/i.test(command),
            
            symbolsExec = ['#', '*', '&', '{', '}', '|', '\'', '"', ';'],
            isSymbol    = Util.isContainStr(command, symbolsExec);
        
        Util.checkArgs(arguments, ['connNum', 'callback', 'command']);
        
        if (isCD || isCDWin && WIN || isVolume) {
            ret = true;
            
            onCD(command, dir, function(error, json) {
                var path;
                
                if (json.path) {
                    path        = json.path;
                    options.cwd = path;
                }
                
                callback(error, json);
            });
        }
        
        if (!ret) {
            if (WIN)
                command    = 'cmd /C ' + command;
            
            firstChar       = command[0];
            
            if (firstChar === ' ' || isSymbol)
                setExec(command, options, callback);
            else
                setSpawn(command, options, callback);
        }
    }
    
    /**
     * function send result of command to client
     * @param callback
     */
    function setExec(command, options, callback) {
        var error, child;
        
         error   = Util.exec.tryLog(function() {
            child = exec(command, options);
        });
        
        if (!error)
            setListeners(child, callback);
        else
            callback(error, {
                stderr: addNewLine(error.message)
            });
    }
    
    function setSpawn(сommand, options, callback) {
        var cmd, error,
            args        = сommand.split(' ');
           
        
        Util.checkArgs(arguments, ['command', 'callback']);
        
        if (!callback) {
            callback    = options;
            options     = null;
        }
        
        сommand = args.shift();
        
        error   = Util.exec.tryLog(function() {
            cmd = spawn(сommand, args, options);
        });
        
        if (!error)
            setListeners(cmd, callback);
        else
            callback(error, {
                stderr: addNewLine(error.message)
            });
    }
    
    function setListeners(child, callback) {
        var isSended,
            func        = function(error, stdout, stderr) {
                var errorStr = '';
                
                isSended = true;
                
                if (error)
                    errorStr = error.message;
                else if (stderr)
                    errorStr = stderr;
                
                errorStr = addNewLine(errorStr);
                
                callback(error, {
                    stderr: errorStr,
                    stdout: stdout
                });
            };
        Util.checkArgs(arguments, ['child', 'callback']);
        
        child.stderr.setEncoding('utf8');
        child.stdout.setEncoding('utf8');
        
        child.stdout.on('data', function(data) {
            func(null, data);
        });
        
        child.stderr.on('data', function(error) {
            func(null, null, error);
        });
        
        child.on('error', function(error) {
            func(error);
        });
        
        child.on('close', function() {
            child = null;
            
            if (!isSended)
                func();
        });
    }
    
    function onCD(command, currDir, callback) {
        var CD              = 'cd ',
            HOME            = process.env.HOME,
            
            isChangeVolume  = win.isChangeVolume(command),
            isVolume        = win.isVolume(command),
            paramDir        = Util.rmStrOnce(command, [CD, 'cd']),
            
            regExpHome      = new RegExp('^~'),
            regExpRoot      = new RegExp('^[/\\\\]'),
            
            isWildCard      = Util.isContainStr(paramDir, ['*', '?']),
            isHome          = regExpHome.test(paramDir) && !WIN,
            isRoot,
            
            onExec          = function (error, json) {
                var path        = paramDir;
                
                if (error)
                    path        = '';
                
                if (json)
                    json.path = path;
                
                callback(error, json);
            };
        
        if (isHome) {
            command     = command.replace('~', HOME);
            paramDir    = paramDir.replace('~', HOME);
        }
        
        if (!paramDir && !WIN)
            paramDir = '.';
        
        if (!isChangeVolume || isVolume) {
            paramDir    = getFirstWord(paramDir);
            paramDir    = path.normalize(paramDir);
            
            isRoot      = regExpRoot.test(paramDir);
            
            command     = Util.rmStrOnce(command, [
                CD,
                paramDir,
                '\'' + paramDir + '\'',
                '"'  + paramDir + '"',
            ]);
            
            if (!isHome && !isRoot)
                paramDir    = path.join(currDir, paramDir);
            
            if (isWildCard)
                command = CD + paramDir + ' ' + command;
            else
                command = CD + '"' + paramDir + '" ' + command;
        }
        
        if (!isWildCard) {
            setExec(command, {cwd: paramDir}, onExec);
        } else {
            find(paramDir, function(error, dirs) {
                var dir;
                
                if (!error)
                    dir = dirs[0];
                    
                paramDir    = dir;
                setExec(command, {cwd: dir}, onExec);
            });
        }
    }
    
    function getFirstWord(str) {
        var word, result,
            regStrEnd       = getRegStrEnd(),
            regStr          = '^(.*?)',
            regStrQuotes    = '^"(.*)"',
            regExp          = new RegExp(regStr + regStrEnd),
            regExpQuotes    = new RegExp(regStrQuotes + regStrEnd + '?'),
            is              = Util.type.string(str);
        
        if (is) {
            result  = str.match(regExpQuotes);
            
            if (result) {
                word    = result[1];
            } else {
                result  = str.match(regExp);
                word    = result && result[1];
            }
            
            if (!word)
                word    = str;
        }
        
        return word;
    }
    
    function getRegStrEnd() {
        var regStrEnd = '(\\s|\\;|&&|\\|\\|)';
        
        return regStrEnd;
    }
    
})();
