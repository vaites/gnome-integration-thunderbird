Gnome Integration 0.4.4
=======================

* Fixed account listing (thanks to Stefan Ganser)
* Fixed selective notification for single accounts
* Migration from Google code to [GitHub](https://github.com/vaites/gnome-integration-thunderbird)

Gnome Integration 0.4.3
=======================

* Added transient:1 for newer versions of libnotify
* Compatibility with Thunderbird 8.0

Gnome Integration 0.4.2
=======================

* Compatibility with Thunderbird 5.0, 6.0 and 7.0

Gnome Integration 0.4.1
=======================

* Customizable sound player: Thunderbird, libnotify or external(notify-osd don't support sounds)
* Fixed details in options dialog
* Small fixes and code optimizations

Gnome Integration 0.4.0
=======================

* Extension built without chrome JAR to allow direct access to files
* Added support for Gravatar (with cache) and option in Options dialog
* Added support for tray icon notifications (requires Zenity)
* Added support for choose what accounts must be omitted in notifications
* Added account variable (%u)
* Avoid notifications when new mail is spam
* Fixed browser launcher for links
* Various changes in Options dialog
* Use of classes instead of functions to improove maintenance and performance
* Small fixes and code optimizations
* Compatibility up to Thunderbird 3.1

Gnome Integration 0.3.1
=======================

* Fixed author name (%n) and (%i) variables
* Fixed duplicated messages in Thunderbird 2.0
* Added mail variable (%m) to show only e-mail and strip author name
* Added limit to avoid too many notifications at the same time
* Legend is now in a separated dialog (press "Help")

Gnome Integration 0.3
=====================

* Backwards compatibility with Thunderbird 2.0
* Fixed compatibility with Icedove
* Warning and auto-disable if platform is not Linux
* Added CHANGELOG and LICENSE

Gnome Integration 0.2
=====================

* First public version uploaded to Mozilla Addons
* Final license and credits

Gnome Integration 0.1 (initial release)
=======================================

* Code based on "Growl New Message Notification" (https://addons.mozilla.org/es-ES/thunderbird/addon/3448)
* Mozilla Thunderbird and Icedove 3.0 support
* Urgency support based on message priorities
* Sound and icon/status support
* en-US, es-ES and gl-ES locales
