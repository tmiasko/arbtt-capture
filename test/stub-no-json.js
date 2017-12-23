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
//
// Testing stub for arbtt-import that doesn't support JSON output format.

'use strict';

const usage = `
Usage: arbtt-import [OPTIONS...]
  -h, -?     --help           show this help
  -V         --version        show the version number
  -f FILE    --logfile=FILE   use this file instead of ~/.arbtt/capture.log
  -a         --append         append to the logfile, instead of overriding it
  -t FORMAT  --format=FORMAT  output format, one of Show (default)`;

if (ARGV.length !== 1) {
  throw new Error();
}
if (ARGV[0] !== '--help') {
  throw new Error();
}
log(usage);

