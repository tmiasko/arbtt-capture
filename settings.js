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
            const defaultPath = GLib.get_home_dir() + '/.arbtt/capture.log';
            settings.set_string('log-path', defaultPath);
        }

        return settings;
    }

    return {
        getSettings: getSettings,
    };
}());
