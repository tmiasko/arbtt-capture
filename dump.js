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
// Reimplementation of arbtt-dump utility.

'use strict';

const Gio = imports.gi.Gio;
const TimeLog = imports.timeLog;

function pad(number) {
    return number < 10 ? '0' + number : number;
}

function formatTime(d) {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

function formatHeader(timestamp, idle) {
    return `${formatDate(timestamp)} ${formatTime(timestamp)} (${idle}ms inactive):\n`;
}

function formatDesktop(desktop) {
    return `    Current Desktop: ${desktop}\n`;
}

function formatWindow({active, title, program}) {
    return `    (${active ? '*' : ' '}) ${(program + ':').padEnd(15)} ${title}\n`;
}

function formatEntry({timestamp, idle, desktop, windows}) {
  let s = formatHeader(timestamp, idle) + formatDesktop(desktop);
  for (const w of windows) {
    s += formatWindow(w);
  }
  return s;
}

function dump(stream, path) {
    for (let entry of new TimeLog.Reader(path)) {
        stream.write_all(formatEntry(entry), null);
    }
}

const stdout = Gio.UnixOutputStream.new(1, false);
for (const path of ARGV) {
    dump(stdout, path);
}
stdout.close(null);
