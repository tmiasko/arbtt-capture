'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const TimeLog = imports.timeLog;

// Converts GLib.Bytes into array of integers in range 0.255.
function bytesToArray(bytes) {
    const bytesArray = bytes.toArray();
    const array = [];
    for (let i=0; i != bytesArray.length; i++) {
        array.push(bytesArray[i]);
    }
    return array;
}

// Checks if two GLib.Bytes instances are equal or throws an error.
function assertBytesEqual(expected, actual) {
    if (!expected.equal(actual)) {
        log([expected.get_size(), actual.get_size()]);
        let msg = 'assertion failed.\n';
        msg += `expected: [${bytesToArray(expected)}]\n`;
        msg += `actual:   [${bytesToArray(actual)}]`;
        throw new Error(msg)
    }
}

function testWriteBool() {
    let s = new TimeLog.Serializer();
    s.writeBool(false);
    assertBytesEqual(new GLib.Bytes([0]), s.stealBytes());

    s = new TimeLog.Serializer();
    s.writeBool(true);
    assertBytesEqual(new GLib.Bytes([1]), s.stealBytes());
}

function testWriteInteger() {
    let testCases = [
        {from: 0, to: [0x00, 0x00, 0x00, 0x00, 0x00]},
        {from: 1, to: [0x00, 0x00, 0x00, 0x00, 0x01]},
        {from: -1, to: [0x00, 0xff, 0xff, 0xff, 0xff]},
        {from: 0x11223344, to: [0x00, 0x11, 0x22, 0x33, 0x44]},
        {from: 0x7fffffff, to: [0x00, 0x7f, 0xff, 0xff, 0xff]},
        {from: -0x80000000, to: [0x00, 0x80, 0x00, 0x00, 0x00]},
        {from: 0x80000000, to: [ 0x01,
            0x01,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04,
            0x80, 0x00, 0x00, 0x00]},
        {from: -0x80000001, to: [ 0x01,
            0xff,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04,
            0x80, 0x00, 0x00, 0x01]},
    ];

    for (const {from, to} of testCases) {
        const s = new TimeLog.Serializer();
        s.writeInteger(from);
        let expected = new GLib.Bytes(to);
        let actual = s.stealBytes();
        assertBytesEqual(expected, actual);
    }


    // Safe integer is indeed safe to write.
    const s = new TimeLog.Serializer();
    s.writeInteger(Number.MAX_SAFE_INTEGER);

    // TODO add test for unsafe integers
    // const s = new TimeLog.Serializer();
    // s.writeInteger(Number.MAX_SAFE_INTEGER + 1);
}

function testWriteString() {
    let testCases = [
        {from: "", to: [0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]},
        {from: "abc", to: [0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03,
            0x61, 0x62, 0x63]},
        {from: "🦊", to: [0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
            0xf0, 0x9f, 0xa6, 0x8a]},
    ];

    for (const {from, to} of testCases) {
        const s = new TimeLog.Serializer();
        s.writeString(from);
        let expected = new GLib.Bytes(to);
        let actual = s.stealBytes();
        assertBytesEqual(expected, actual);
    }
}

function testReaderWriter() {
    const [file, stream] = Gio.file_new_tmp(null);
    stream.close(null);

    try {
        const entries = [
            {
                timestamp: new Date(),
                interval: 60,
                desktop: 'Workspace 1',
                idle: 2**34,
                windows: [
                    {active: true, title: 'title', program: 'program'},
                    {active: false, title: '🦊🦉', program: '🦊🦉'},
                ],
            },
            {
                timestamp: new Date(),
                interval: 60,
                desktop: 'Workspace 42',
                idle: 15,
                windows: [
                    {active: true, title: 'title', program: 'program'},
                ],
            },
        ];

        const writer = new TimeLog.Writer(file.get_path());
        for (const entry of entries) {
            writer.write(entry);
        }
        writer.close();

        const reader = new TimeLog.Reader(file.get_path());
        let actualEntries = Array.from(reader);
        log(JSON.stringify(actualEntries));
        // TODO use deep equality
    } finally {
        file.delete(null);
    }
}

testWriteBool();
testWriteInteger();
testWriteString();
testReaderWriter();

