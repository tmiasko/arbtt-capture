#!/usr/bin/env gjs
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

'use strict';

const Gio = imports.gi.Gio;

const { Writer, checkFeatures } = imports.arbtt;

function throwsMessage(fun, expected) {
    let e = null;
    try {
        fun();
    } catch (e) {
        const actual = e.message;
        if (actual !== expected) {
            throw new Error(`unexpected error message.\nexpected: ${expected}\nactual:   ${actual}`);
        }
        return;
    }
    if (e === null) {
        throw new Error('expected an error');
    }
}


function testCheckFeatures() {
    checkFeatures('./test/stub-supported.js');

    throwsMessage(
        () => checkFeatures('./test/stub-no-append.js'),
        'support for --append flag is required, but not available'
    );

    throwsMessage(
        () => checkFeatures('./test/stub-no-json.js'), 
        'support for --format JSON is required, but not available'
    );
}

function testWriter() {
    const entries = [
        {
            date: new Date(),
            interval: 60 * 1000,
            inactive: 1234567,
            windows: [
                {active: true, title: 'title', program: 'program'},
                {active: false, title: '🦊🦉', program: '🦊🦉'},
            ],
            desktop: 'Workspace 1',
        },
        {
            date: new Date(),
            interval: 60 * 1000,
            inactive: 49190,
            windows: [
                {active: true, title: 'title', program: 'program'},
            ],
            desktop: 'Workspace 42',
        },
    ];

    const [file, stream] = Gio.file_new_tmp(null);
    stream.close(null);

    try {
        const writer = new Writer({
            program: 'arbtt-import',
            logPath: file.get_path(),
        });
        for (const entry of entries) {
            writer.append(entry);
        }
        writer.close();

        // TODO: read log back with arbtt-dump -t JSON and compare
    } finally {
        file.delete(null);
    }
}

testCheckFeatures();
testWriter();
