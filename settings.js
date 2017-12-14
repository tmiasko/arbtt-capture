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
// Access to application settings.

var {
    getSettings,
} = (function() {
    'use strict';

    const GLib = imports.gi.GLib;
    const Gio = imports.gi.Gio;

    const Extension = imports.misc.extensionUtils.getCurrentExtension();

    function getSettings() {
        const uuid = Extension.metadata['uuid'];
        const schemaId = Extension.metadata['settings-schema'];
        const GioSSS = Gio.SettingsSchemaSource;
        const schemaSource = GioSSS.new_from_directory(Extension.dir.get_path(), GioSSS.get_default(), false);
        const schema = schemaSource.lookup(schemaId, true);
        if (!schema) {
            throw new Error(`Schema ${schemaId} for extension ${uuid} not found`);
        }
        const settings = new Gio.Settings({settings_schema: schema});

        // Configure defaults before first use,
        // it seems impossible to put those directly in schema file.
        if (!settings.get_string('log-path')) {
            // TODO create .arbtt directory if necessary.
            const defaultPath = GLib.get_home_dir() + '/.arbtt/capture.log';
            settings.set_string('log-path', defaultPath);
        }

        return settings;
    }

    return {
        getSettings: getSettings,
    };
}());
