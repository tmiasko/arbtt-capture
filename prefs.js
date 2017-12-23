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
    const Arbtt = Extension.imports.arbtt;
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

            // Widgets for sampling-interval.
            const intervalTooltip = "Interval between samples. Expressed in seconds.";
            const intervalLabel = new Gtk.Label({
                label: "Sampling interval in seconds",
                tooltip_text: intervalTooltip,
            });
            this.add(intervalLabel);

            const intervalButton = Gtk.SpinButton.new_with_range(1, 5 * 60, 10);
            intervalButton.set_tooltip_text(intervalTooltip);
            settings.bind('sampling-interval', intervalButton, 'value', Gio.SettingsBindFlags.DEFAULT);
            this.attach_next_to(intervalButton, intervalLabel, Gtk.PositionType.RIGHT, 1, 1);


            // Widgets for log-path.
            const logLabel = new Gtk.Label({
                label: 'Log location',
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            this.add(logLabel);

            // Use custom button that opens GtkFileChooserDialog, instead of GtkFileChooserButton
            // because the latter for some reason doesn't support ACTION_SAVE.
            const logButton = Gtk.Button.new_from_icon_name('document-open-symbolic', Gtk.IconSize.BUTTON);
            logButton.set_hexpand(true);
            logButton.set_always_show_image(true);
            logButton.connect('clicked', () => {
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
            settings.bind('log-path', logButton, 'label', Gio.SettingsBindFlags.DEFAULT);
            this.attach_next_to(logButton, logLabel, Gtk.PositionType.RIGHT, 1, 1);

            // Widgets for arbtt-import-path.
            const importTooltip = 'Location of the arbtt-import program, or program name to lookup using PATH environment variable.';
            const importLabel = new Gtk.Label({
                label: 'Location of arbtt-import',
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                tooltip_text: importTooltip,
            });
            this.add(importLabel);

            const importEntry = new Gtk.Entry({
                hexpand: true,
                tooltip_text: importTooltip,
            });
            settings.bind('arbtt-import-path', importEntry, 'text', Gio.SettingsBindFlags.DEFAULT);
            importEntry.connect('focus-out-event', (entry) => {
                const primary = Gtk.EntryIconPosition.PRIMARY;
                try {
                    const program = entry.get_text();
                    Arbtt.checkFeatures(program);
                    entry.set_icon_from_icon_name(primary, null);
                    entry.set_icon_tooltip_text(primary, null);
                    entry.get_style_context().remove_class('error');
                } catch (e) {
                    entry.set_icon_from_icon_name(primary, 'dialog-error-symbolic');
                    entry.set_icon_tooltip_text(primary, e.toString());
                    entry.get_style_context().add_class('error');
                }
            });
            this.attach_next_to(importEntry, importLabel, Gtk.PositionType.RIGHT, 1, 1);
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
