var {
    Reader,
    Writer,
} = (function() {
    'use strict';

    const GLib = imports.gi.GLib;
    const Gio = imports.gi.Gio;
    const ByteArray = imports.byteArray;

    // Magic header used in arbtt file format.
    const MAGIC = "arbtt-timelog-v1\n";

    const INT32_MIN = -(2**31);
    const INT32_MAX = 2**31-1;

    // Char. number range  |        UTF-8 octet sequence
    //    (hexadecimal)    |              (binary)
    // --------------------+---------------------------------------------
    // 0000 0000-0000 007F | 0xxxxxxx
    // 0000 0080-0000 07FF | 110xxxxx 10xxxxxx
    // 0000 0800-0000 FFFF | 1110xxxx 10xxxxxx 10xxxxxx
    // 0001 0000-0010 FFFF | 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
    const UTF8_CHAR_WIDTH = [
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x0F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x1F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x2F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x3F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x4F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x5F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x6F
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, // 0x7F
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 0x8F
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 0x9F
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 0xAF
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, // 0xBF
        0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2, // 0xCF
        2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2, // 0xDF
        3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3, // 0xEF
        4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0, // 0xFF
    ];

    // Converts a Modified Julian Day count to ISO 8601 Ordinal Date format.
    // Returns year and day of the year.
    function toOrdinalDate(mjd) {
        const a = mjd + 678575;
        const quadcent = Math.floor(a / 146097);
        const b = a % 146097;
        const cent = Math.min(Math.floor(b / 36524), 3);
        const c = b - (cent * 36524);
        const quad = Math.floor(c / 1461);
        const d = c % 1461;
        const y = Math.min(Math.floor(d / 365), 3);
        const yd = d - (y * 365) + 1;
        const year = quadcent * 400 + cent * 100 + quad * 4 + y + 1;
        return [year, yd];
    }

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

        constructor(path) {
            const file = Gio.File.new_for_path(path);
            const insertHeader = !file.query_exists(null);
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
            this._stream.write_all(bytes.get_data(), null);
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
            this._stream.close(null);
            const bytes = this._stream.get_base_stream().steal_as_bytes();
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
                this.writeString(desktop, false);
            } catch (e) {
                // Ensure that we don't refer back to strings from partially serialized entry.
                this._lookupPool.clear();
                this._appendPool.length = 0;
                throw e;
            } finally {
                this._lookupPool.clear();
                // Limit string pool to first 255 strings, we can't refer back to others either way.
                for (let i=0; i != this._appendPool.length && i < 255; i++) {
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
                this._stream.put_byte(0, null);
                this._stream.put_int32(value, null);
            } else {
                // TODO implement this!
                throw new Error('not implemented yet');
            }
        }

        writeString(value, saveReference=true) {
            const id = this._lookupPool.get(value);
            if (id !== undefined && 1 <= id && id <= 255) {
                this._stream.put_byte(id, null);
            } else {
                this._stream.put_byte(0, null);

                // Write number of code points first.
                let length = 0;
                for (const codePoint of value) { 
                    length += 1;
                }
                this._stream.put_int64(length, null);

                // Write UTF-8 encoding of each code point.
                const bytes = ByteArray.fromString(value, "UTF-8");
                this._stream.write_all(bytes, null);
            }
            if (saveReference) {
                this._appendPool.push(value);
            }
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

    class Reader {
        constructor(path) {
            const file = Gio.File.new_for_path(path);
            this._stream = Gio.DataInputStream.new(file.read(null));
            const header = this._stream.read_bytes(MAGIC.length, null);
            if (header.get_data() != MAGIC) {
                throw new Error("invalid magic bytes");
            }

            this._lookupPool = []
            this._appendPool = [];
        }

        *[Symbol.iterator]() {
            while (true) {
                // DataInputStream read_byte throws an exception on EOF, which we don't want.
                // Instead we use read_byte from BufferedInputStream which returns -1 on EOF.
                const entryVersion = Gio.BufferedInputStream.prototype.read_byte.call(this._stream, null);
                if (entryVersion == -1) {
                    return null;
                }
                if (entryVersion != 1) {
                    throw new Error(`unsupported TimeLogEntry version tag: ${entryVersion}`);
                }

                const time = this.readTimestamp();
                // Capture interval in milli-seconds.
                const interval = this.readInteger();

                let dataVersion = this._stream.read_byte(null);
                if (dataVersion != 3) {
                    throw new Error(`unsupported CaptureData version tag: ${dataVersion}`);
                }

                const windows = new Array(this.readInt64());
                for (let i of windows.keys()) {
                    windows[i] = {
                        active: this.readBool(),
                        title: this.readString(),
                        program: this.readString(),
                    };
                }

                // Idle time in milliseconds.
                const idle = this.readInteger();
                const desktop = this.readString(false);

                // TODO wrap in try catch ?
                this._lookupPool = this._appendPool;
                this._appendPool = [];

                yield {time, interval, idle, desktop, windows};
            }
        }

        // Reads UTC timestamp.
        readTimestamp() {
            const modifiedJulianDay = this.readInteger();
            const [year, yd] = toOrdinalDate(modifiedJulianDay);

            const secondsNum = this.readInteger();
            const secondsDen = this.readInteger();
            const seconds = secondsNum / secondsDen;
            return new Date(Date.UTC(year, 0, yd, 0, 0, seconds));
        }

        // Reads given number of bytes. Returns an array of integers in range 0..255.
        readBytes(count) {
            let result = [];
            while (count > 0) {
                const bytes = this._stream.read_bytes(count, null).toArray();
                if (bytes.length == 0) {
                    throw new Error("unexpected eof");
                }
                count -= bytes.length;
                for (let i=0; i != bytes.length; i++) {
                    result.push(bytes[i]);
                }
            }
            return result;
        }

        // Reads a boolean.
        readBool() {
            const value = this._stream.read_byte(null);
            if (value === 0) {
                return false;
            } else if (value === 1) {
                return true;
            } else {
                throw new Error(`invalid boolean value, should be 0 or 1, instead was: ${value}`);
            }
        }

        // Reads 64-bit integer.
        readInt64() {
            const value = this._stream.read_int64(null);
            if (!Number.isSafeInteger(value)) {
                throw new Error("integer overflow");
            }
            return value;
        }

        // Reads arbitrary sized integer.
        readInteger() {
            const tag = this._stream.read_byte(null);
            if (tag == 0) {
                return this._stream.read_int32(null);
            } else {
                const sign = this._stream.read_byte(null);
                const count = this.readInt64();
                const bytes = this.readBytes(count);

                // Integers are in litte endian format, convert them to big endian:
                bytes.reverse();

                let value = 0;
                for (const byte of bytes) {
                    value = value * 256 + byte;
                    if (!Number.isSafeInteger(value)) {
                        throw new Error("integer overflow");
                    }
                }

                return sign == 1 ? value : -value;
            }
        }

        // Reads a single UTF-8 character.
        readChar() {
            const bytes = [this._stream.read_byte(null)];
            const width = UTF8_CHAR_WIDTH[bytes[0]];
            if (width == 0) {
                throw new Error("invalid utf-8 string"); 
            }
            for (let i=1; i != width; i++) {
                bytes.push(this._stream.read_byte(null));
            }
            // TODO just use ByteArray with encoding argument here.
            return decodeURIComponent(escape(String.fromCharCode.apply(null, bytes)));
        }

        // Reads UTF-8 encoded string.
        readString(saveReference=true) {
            const tag = this._stream.read_byte(null);
            let result;
            if (tag == 0) {
                const count = this.readInt64();
                result = "";
                for (let i=0; i != count; ++i) {
                    result += this.readChar();
                }
            } else {
                // TODO add error checking.
                result = this._lookupPool[tag-1];
            }
            if (saveReference) {
                this._appendPool.push(result);
            }
            return result;
        }
    }

    return {
        Reader,
        Writer,
    };
}());
