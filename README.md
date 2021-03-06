# arbtt-capture for GNOME Shell 

This is a gnome shell extension that records which windows are open, which one
has focus, and time since your last action. This information is by default
stored in ~/.arbtt/capture.log using format compatible with [automatic,
rule-based time tracker - arbtt][arbtt].

It supports both X11 and Wayland. In fact, the compatibility with Wayland is
the only reason it exists. Otherwise it does not posses compelling advantages
over the original arbtt-capture.

*WARNING: The log file might contain very sensitive private data. Make sure you
understand the consequences of a full-time logger and be careful with this
data.*

## Installation and usage

 1. [Install arbtt][arbtt-installation]. Its arbtt-import application
    should support at least `--append` flag and `--format=JSON`.
 2. Clone git repository into GNOME shell extension directory:
    ```
    mkdir -p ~/.local/share/gnome-shell/extensions
    git clone https://github.com/tmiasko/arbtt-capture ~/.local/share/gnome-shell/extensions/arbtt-capture@tmiasko.github.com
    ```
 3. Restart gnome-shell.
 4. Disable original arbtt-capture, if you have used it before.
 5. Configure and enable extension using gnome-tweak-tool.

To process the logs use arbtt-stats from original [arbtt][arbtt] software
package. See [user guide][arbtt-user-guide] for details.

## License

GNU GPLv3, see LICENSE file for details.

[arbtt]: http://arbtt.nomeata.de/#what
[arbtt-user-guide]: http://arbtt.nomeata.de/doc/users_guide/configuration.html
[arbtt-installation]: http://arbtt.nomeata.de/doc/users_guide/index.html#installation
