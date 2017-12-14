var {
    init, 
} = (function() {
    'use strict';

    const ByteArray = imports.byteArray;
    const GLib = imports.gi.GLib;
    const Gio = imports.gi.Gio;
    const Main = imports.ui.main;
    const Meta = imports.gi.Meta;
    
    const Extension = imports.misc.extensionUtils.getCurrentExtension();
    const Settings = Extension.imports.settings;

    class Capture {

        constructor() {
            this._timeoutId = null;
            this._settings = Settings.getSettings();
        }

        enable() {
            const interval = this._settings.get_uint('sampling-interval');
            const file = Gio.File.new_for_path(this._settings.get_string('log-path'));
            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, interval, () => {
                const entry = generateLogEntry();
                entry.interval = interval;
                const entryBytes = serialize(entry);

                const insertHeader = !file.query_exists(null);
                const stream = Gio.DataOutputStream.new(file.append_to(Gio.FileCreateFlags.NONE, null));
                if (insertHeader) {
                    stream.write_all(MAGIC, null);
                }
                stream.write_all(entryBytes.get_data(), null);
                stream.close(null);
                return true;
            });
        }

        disable() {
            if (this._timeoutId !== null) {
                GLib.source_remove(this._timeoutId);
                this._timeoutId = null;
            }
        }
    };

    function generateLogEntry() {
        const focused = global.display.get_focus_window();
        const windows = global.display.get_tab_list(Meta.TabList.NORMAL, null).map((w) => {
            return {
                title: w.get_title(),
                program: w.get_wm_class_instance(),
                active: w == focused,
            }
        });

        const focusedFound = windows.some((w) => w.active);
        if (focused !== null && !focusedFound) {
            log(`focused window not found in tab-list: ${focused.get_title()}`);
        }

        const workspaceIndex = global.screen.get_active_workspace_index();
        const workspace = Meta.prefs_get_workspace_name(workspaceIndex);

        const currentTime = global.display.get_current_time_roundtrip();
        const userTime = global.display.get_last_user_time();
        const idle = currentTime - userTime;

        return {
            timestamp: new Date(),
            desktop: workspace,
            idle: idle,
            windows: windows,
        }
    }

    function init() {
        return new Capture();
    }

    const MAGIC = "arbtt-timelog-v1\n";

    function isLeapYear(year) {
        return (year % 4 === 0) && ((year % 100 !== 0) || (year % 400 === 0));
    }

    // Converts UTC month and day into day of the year.
    function dayOfTheYear(date) {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth();
        const d = date.getUTCDate();
        const k = m <= 1 ? 0 : (isLeapYear(y) ? -1 : -2);
        return Math.floor((367 * m + 5) / 12) + k + d;
    }

    // Converts UTC date into Modified Julian Day (number of days since 1858-11-17).
    function toModifiedJulianDay(date) {
        const y = date.getUTCFullYear() - 1;
        return dayOfTheYear(date) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 678576; 
    }

    // Converts UTC time into total number of milliseconds since midnight.
    function toMilliseconds(date) {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        const milliseconds = date.getUTCMilliseconds();
        return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
    }

    let file = Gio.File.new_for_path('/home/tm/a.log');
    const stream = Gio.DataOutputStream.new(file.append_to(Gio.FileCreateFlags.NONE, null));

    function serialize({timestamp, interval, desktop, idle, windows}) {
        const memoryStream = Gio.MemoryOutputStream.new_resizable();
        const stream = Gio.DataOutputStream.new(memoryStream);

        // TimeLogEntry version tag.
        stream.put_byte(1, null);
        writeTimestamp(stream, timestamp);
        writeInteger(stream, 1000*interval);
        // Data version tag.
        stream.put_byte(3, null);
        stream.put_int64(windows.length, null);
        for (const {active, title, program} of windows) {
            writeBool(stream, active);
            writeString(stream, title);
            writeString(stream, program);
        }
        writeInteger(stream, idle);
        writeString(stream, desktop);

        stream.close(null);
        return memoryStream.steal_as_bytes();
    }

    function writeBool(stream, value) {
        stream.put_byte(value ? 1 : 0, null);
    }

    function writeInt64(stream, value) {
        stream.put_int64(value, null);
    }

    const INT32_MIN = -(2**31);
    const INT32_MAX = 2**31-1;

    function writeInteger(stream, value) {
        if (INT32_MIN <= value && value <= INT32_MAX) {
            stream.put_byte(0, null);
            stream.put_int32(value, null);
        } else {
            throw new Error('not implemented yet');
        }
    }

    function writeString(stream, string) {
        stream.put_byte(0, null);

        let length = 0;
        for (const codePoint of string) { 
            length += 1;
        }

        stream.put_int64(length, null);
        const bytes = ByteArray.fromString(string, "UTF-8");
        stream.write_all(bytes, null);
    }

    function writeTimestamp(stream, date) {
        const modifiedJulianDay = toModifiedJulianDay(date);
        const totalMs = toMilliseconds(date);
        writeInteger(stream, modifiedJulianDay);
        writeInteger(stream, totalMs);
        writeInteger(stream, 1000);
    }

    return {
        init: init,
    }
}());
