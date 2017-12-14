'use strict';

const Gio = imports.gi.Gio;
const TimeLog = imports.timeLog;

const stdout = Gio.UnixOutputStream.new(1, false);
for (const path of ARGV) {
    const reader = new TimeLog.Reader(path);
    for (let entry of reader) {
        stdout.write_all(JSON.stringify(entry, null, 1), null)
        stdout.write_all('\n', null);
    }
}
stdout.close(null);
