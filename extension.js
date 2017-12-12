var {
    init, 
    enable, 
    disable
} = (function() {
    'use strict';

    const GLib = imports.gi.GLib;
    const Main = imports.ui.main;
    const Meta = imports.gi.Meta;
    // const This = imports.misc.extensionUtils.getCurrentExtension();

    function logWindows() {
        log("###########");
        const windows = global.get_window_actors().map((w) => w.get_meta_window());
        for (const window of windows) {
            log(`window title: ${window.get_title()}`);
            log(`program name: ${window.get_wm_class_instance()}`);
        }

        const workspaceIndex = global.screen.get_active_workspace_index();
        log(`workspace:    ${Meta.prefs_get_workspace_name(workspaceIndex)}`);

        const currentTime = global.display.get_current_time_roundtrip();
        const userTime = global.display.get_last_user_time();
        const idleDuration = currentTime - userTime;
        log(`idle: ${idleDuration / 1000}s`);

        const focused = global.display.get_focus_window();
        if (focused == null) {
            log("WARNING: no focus");
        } else {
            log(focused);
            log("CONTAINS: " + windows.includes(focused));
        }
    }

    function init() {
        log('initialized');
    }

    let timeoutId = null;
    function enable() {
        timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 5, () => {
            logWindows();
            return true;
        });
        log('enabled');
    }

    function disable() {
        if (timeoutId != null) {
            GLib.source_remove(timeoutId);
            timeoutId = null;
        }
        log('disabled');
    }

    return {
        init: init,
        enable: enable,
        disable: disable
    }
}());
