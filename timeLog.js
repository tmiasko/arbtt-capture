var {
    Writer
} = (function() {
    'use strict';

    const GLib = imports.gi.GLib;
    const Gio = imports.gi.Gio;
    const ByteArray = imports.byteArray;

    // Magic header used in arbtt file format.
    const MAGIC = "arbtt-timelog-v1\n";

    const INT32_MIN = -(2**31);
    const INT32_MAX = 2**31-1;

    // Converts UTC date into Modified Julian Day (number of days since 1858-11-17).
    function utcDateToModifiedJulianDay(date) {
        const y = date.getUTCFullYear() - 1;
        return dayOfTheYear(date) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 678576; 
    }

    // Converts UTC time into total number of milliseconds since midnight.
    function utcTimeToMilliseconds(date) {
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        const milliseconds = date.getUTCMilliseconds();
        return ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds;
    }

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

    class Writer {

        constructor(filename) {
            const insertHeader = file.query_exists(null);
            this._stream = file.append_to(Gio.FileCreateFlags.NONE, null);
            if (insertHeader) {
                this._stream.write_all(MAGIC, null);
                this._stream.flush(null);
            }
            this._serializer = new Serializer();
        }

        writeEntry(entry) {
            // TODO replace with a single method to write and steal bytes?
            this._serializer.writeEntry(entry);
            const bytes = this._serializer.stealBytes();
            this._stream.write_all(bytes, null);
            this._stream.flush(null);
        }
    }

    function newMemoryBackedDataStream() {
        const memoryStream = Gio.MemoryOutputStream.new_resizable();
        return Gio.DataOutputStream.new(memoryStream);
    }

    class Serializer {

        constructor() {
            this._stream = newMemoryBackedDataStream();
            this._lookupPool = new Map();
            this._appendPool = [];
        }

        stealBytes() {
            this._stream.close();
            const bytes = this._stream.steal_as_bytes();
            this._stream = newMemoryBackedDataStream();
            return bytes;
        }

        writeEntry({timestamp, interval, desktop, idle, windows}) {
            try {
                // TimeLogEntry version tag.
                this._stream.put_byte(1, null);
                this.writeTimestamp(timestamp);
                // Interval is in seconds, but is serialized in milliseconds.
                this.writeInteger(1000*interval);
                // Data version tag.
                this._stream.put_byte(3, null);
                this._stream.put_int64(windows.length, null);
                for (const {active, title, program} of windows) {
                    this.writeBool(active);
                    this.writeString(title);
                    this.writeString(program);
                }
                this.writeInteger(idle);
                this.writeString(desktop);
            } catch (e) {
                // Ensure that we don't refer back to strings from partially serialized entry.
                this._lookupPool.clear();
                this._appendPool.length = 0;
                throw e;
            } finally {
                this._lookupPool.clear();
                // Limit string pool to first 255 strings, we can't refer back to others either way.
                for (const i=0; i != this._appendPool.length && i < 255; i++) {
                    const string = this._appendPool[i];
                    if (!this._lookupPool.has(string)) {
                        const id = i + 1;
                        this._lookupPool.set(string, id);
                    }
                }
                this._appendPool.length = 0;
            }
        }

        writeBool(value) {
            this._stream.put_byte(value ? 1 : 0, null);
        }

        writeInteger(value) {
            if (INT32_MIN <= value && value <= INT32_MAX) {
                this.stream.put_byte(0, null);
                this.stream.put_int32(value, null);
            } else {
                // TODO implement this!
                throw new Error('not implemented yet');
            }
        }

        writeString(value) {
            const id = this._lookupPool.get(value);
            if (id !== undefined && 1 <= id && id <= 255) {
                this._stream.put_byte(id, null);
            } else {
                this._stream.put_byte(0, null);

                // Write number of code points first.
                let length = 0;
                for (const codePoint of string) { 
                    length += 1;
                }
                this._stream.put_int64(length, null);

                // Write UTF-8 encoding of each code point.
                const bytes = ByteArray.fromString(string, "UTF-8");
                this._stream.write_all(bytes, null);
            }
            this._appendPool.push(value);
        }

        writeTimestamp(date) {
            const modifiedJulianDay = utcDateToModifiedJulianDay(date);
            const totalMs = utcTimeToMilliseconds(date);
            this.writeInteger(modifiedJulianDay);
            // Time is serialized as a simple fraction denoting number of seconds.
            this.writeInteger(totalMs);
            this.writeInteger(1000);
        }
    }

    return {
        Writer: Writer,
    };
}());
