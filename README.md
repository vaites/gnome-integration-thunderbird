[![Current release](https://img.shields.io/github/release/vaites/gnome-integration-thunderbird.svg)](https://github.com/vaites/gnome-integration-thunderbird/releases/latest)
[![Downloads](https://img.shields.io/badge/downloads-150k-brightgreen.svg)](https://addons.mozilla.org/en-US/firefox/addon/gnome-integration/statistics/)
[![License](https://img.shields.io/github/license/vaites/gnome-integration-thunderbird.svg)](https://github.com/vaites/gnome-integration-thunderbird/blob/master/LICENSE.txt)

Gnome Integration for Mozilla Thunderbird
=========================================

Provides improved integration with Gnome using libnotify.

**IMPORTANT**: due the hard code rewrite needed to upgrade this extension to be compatible with [Mozilla Thunderbird 68](https://developer.thunderbird.net/add-ons/tb68) and greater, this project is **abandoned** and the extension is considered obsolete. 

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
