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
// Extension settings widget.

var {
    init,
    buildPrefsWidget,
} = (function() {
    'use strict';

    const GLib = imports.gi.GLib;
    const GObject = imports.gi.GObject;
    const Gio = imports.gi.Gio;
    const Gtk = imports.gi.Gtk;

    const Extension = imports.misc.extensionUtils.getCurrentExtension();
    const Settings = Extension.imports.settings;

    const SettingsWidget = GObject.registerClass(
    class SettingsWidget extends Gtk.Grid {

        _init(params) {
            super._init(params);
            this.margin = 18;
            this.row_spacing = 6;
            this.column_spacing = 12;
            this.set_orientation(Gtk.Orientation.VERTICAL);

            const settings = Settings.getSettings();

            let label = new Gtk.Label({
                label: "Sampling interval in seconds",
            });
            this.add(label);

            let entry = Gtk.SpinButton.new_with_range(1, 5 * 60, 10);
            entry.set_tooltip_text("Interval between samples. Expressed in seconds.");
            settings.bind('sampling-interval', entry, 'value', Gio.SettingsBindFlags.DEFAULT);
            this.attach_next_to(entry, label, Gtk.PositionType.RIGHT, 1, 1);


            label = new Gtk.Label({
                label: 'Log location',
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            this.add(label);

            // Use custom button that opens GtkFileChooserDialog, instead of GtkFileChooserButton
            // because the latter for some reason doesn't support ACTION_SAVE.
            let button = Gtk.Button.new_from_icon_name('document-open-symbolic', Gtk.IconSize.BUTTON);
            button.set_hexpand(true);
            button.set_always_show_image(true);
            button.connect('clicked', () => {
                const dialog = new Gtk.FileChooserDialog({
                    action: Gtk.FileChooserAction.SAVE,
                    show_hidden: true,
                    create_folders: true,
                });
                const currentPath = settings.get_string('log-path');
                dialog.set_filename(currentPath);
                dialog.add_button("Select", Gtk.ResponseType.OK);
                dialog.add_button("Cancel", Gtk.ResponseType.CANCEL);
                if (dialog.run() === Gtk.ResponseType.OK) {
                    settings.set_string('log-path', dialog.get_filename());
                }
                dialog.destroy();
            });
            settings.bind('log-path', button, 'label', Gio.SettingsBindFlags.DEFAULT);
            this.attach_next_to(button, label, Gtk.PositionType.RIGHT, 1, 1);
        }
    });

    function init() {
    }

    function buildPrefsWidget() {
        const widget = new SettingsWidget();
        widget.show_all();
        return widget;
    }

    return {
        init: init,
        buildPrefsWidget: buildPrefsWidget,
    };
}());
