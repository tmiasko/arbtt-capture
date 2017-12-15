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
// Extension entry point.

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
    const TimeLog = Extension.imports.timeLog;

    class Capture {

        constructor() {
            this._timeoutId = null;
            this._settings = Settings.getSettings();
        }

        enable() {
            const interval = this._settings.get_uint('sampling-interval');
            const path = this._settings.get_string('log-path');
            const writer = new TimeLog.Writer(path);

            this._timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, interval, () => {
                const entry = generateLogEntry();
                entry.interval = interval;
                writer.write(entry);
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
        let focused = global.display.get_focus_window();
        if (focused !== null) {
            // Move along ancestry skipping over transient windows.
            focused = focused.find_root_ancestor();
        }
        const windows = global.display.get_tab_list(Meta.TabList.NORMAL, null).map((w) => {
            return {
                title: w.get_title(),
                program: w.get_wm_class_instance(),
                active: w == focused,
            }
        });

        const focusedFound = windows.some((w) => w.active);
        if (focused !== null && !focusedFound) {
            log(`Focused window not found in tab-list: title=${focused.get_title()}, wm_class=${focused.get_wm_class()}`);
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

    return {
        init: init,
    }
}());
