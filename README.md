Gnome Integration for Mozilla Thunderbird
=========================================

Provides improved integration with Gnome using libnotify.

Features
--------

* Customizable text (title and message)
* Level of urgency based on the priority of messages
* Sound (no more */dev/dsp: Device or resource busy*)
* Icon or state
* Duration 

Requirements
------------

* Mozilla Thunderbird 2.0 or newer
* `notify-send` binary (package `libnotify-bin` in Debian based distros, `libnotify` for RPM distros) 

Install
-------

This extension is available at [Mozilla Addons](https://addons.mozilla.org/es/thunderbird/addon/gnome-integration/)
but you can build and install the XPI with the `build.sh` script.