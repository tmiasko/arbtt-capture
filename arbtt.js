// Copyright (C) 2017 Tomasz Miąsko
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// Interface to arbtt-import application.

var {
    Writer,
    checkFeatures,
} = (function() {
    'use strict';

    const Gio = imports.gi.Gio;

    // Checks if given arbtt-import supports all required features.
    // On failure, throws an error with description what is missing.
    function checkFeatures(program) {
        const argv = [program, '--help'];
        const flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE;
        const process = Gio.Subprocess.new(argv, flags);
        const [, output] = process.communicate_utf8(null, null);
        if (!process.get_if_exited()) {
            throw new Error('process didn\'t exit normally');
        }
        const exitStatus = process.get_exit_status();
        if (exitStatus !== 0) {
            throw new Error(`process returned non-zero exit status: ${exitStatus}`);
        }
        const hasJsonFormat = output.includes('--format') && output.includes('JSON');
        if (!hasJsonFormat) {
            throw new Error('support for --format JSON is required, but not available');
        }
        const hasAppend = output.includes('--append');
        if (!hasAppend) {
            throw new Error('support for --append flag is required, but not available');
        }
    }

    // Wrapper over arbtt-import utility.
    class Writer {

        // program - path to the arbtt-import, or a program name
        // logPath - path to time log
        constructor({program, logPath}) {
            const argv = [
                program,
                '--format', 'JSON', 
                '--append',
                '--logfile', logPath,
            ];
            const flags = Gio.SubprocessFlags.STDIN_PIPE;
            this._process = Gio.Subprocess.new(argv, flags);
        }

        // Appends given entry to the the time log.
        append({date, interval, inactive, windows, desktop}) {
            const entry = {
                date: date.toISOString(),
                // This field is unfortunately misnamed ...
                rate: interval,
                inactive,
                windows,
                desktop,
            };
            const bytes = JSON.stringify(entry);
            const stream = this._process.get_stdin_pipe();
            stream.write_all(bytes, null);
            stream.flush(null);
        }

        close() {
            const stream = this._process.get_stdin_pipe();
            stream.close(null);
            this._process.wait_check(null);
        }
    }

    return {
        Writer,
        checkFeatures,
    };
}());
