/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the GNU General Public License Version
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.txt
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Initial Developer of the Original Code is Mitar <mitar@tnode.com>
 * https://addons.mozilla.org/es-ES/thunderbird/addon/3448
 * Portions created by the Initial Developer are Copyright (C) 2006-2009
 * the Initial Developer. All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

var gnomeIntegrationOptions =
	{
	/**
	 *
	 **/
	bundle: null,

	/**
	 *
	 **/
	preferences: null,

	/**
	 * Populate option fields with saved preferences
	 */
	init: function()
		{
		// remove event to avoid duplicated events
		removeEventListener("load", function() { gnomeIntegrationOptions.init(); }, true);


		// load common classess
		this.preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		this.bundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://gnomeintegration/locale/gnomeintegration.properties");

		// populates players menulist
		var player = document.getElementById("gnomeintegrationplayer");
		if(gnomeIntegration.which('canberra-gtk-play')) player.appendItem(this.lang('gnomeintegration.notify.player.canberra'), 'canberra');
		if(gnomeIntegration.which('mplayer'))			player.appendItem(this.lang('gnomeintegration.notify.player.mplayer'), 'mplayer');
		if(gnomeIntegration.which('play'))				player.appendItem(this.lang('gnomeintegration.notify.player.sox'), 'sox');

		// fill form fields with saved preferences
		document.getElementById("gnomeintegrationtitle").value = this.pref("extensions.gnomeintegration.title");
		document.getElementById("gnomeintegrationmessage").value = this.pref("extensions.gnomeintegration.message");
		document.getElementById("gnomeintegrationcommand").value = this.pref("extensions.gnomeintegration.command");
		document.getElementById("gnomeintegrationtimeout").value = this.pref("extensions.gnomeintegration.timeout");
		document.getElementById("gnomeintegrationsound").value = this.pref("extensions.gnomeintegration.sound");
		document.getElementById("gnomeintegrationplayer").value = this.pref("extensions.gnomeintegration.player");
		document.getElementById("gnomeintegrationicon").value = this.pref("extensions.gnomeintegration.icon");
		document.getElementById("gnomeintegrationtray").checked = (this.pref("extensions.gnomeintegration.tray") == 'yes');
		document.getElementById("gnomeintegrationgravatar").checked = (this.pref("extensions.gnomeintegration.gravatar") == 'yes');

		// ¿platform is Linux?
		var linux = (navigator.platform.indexOf('Linux') != -1);

		// ¿are notifications enabled?
		var notify = (this.pref("extensions.gnomeintegration.notify") == 'yes');
		document.getElementById("gnomeintegrationnotify").checked = notify;
		if(linux == false || notify == false) this.toggleEnable();

		// fill account list
		var selected = this.pref("extensions.gnomeintegration.accounts");
		var accounts = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager).accounts;
        var account_count = accounts.queryElementAt ? accounts.length : accounts.Count();
		for (var i = 0; i < account_count; i++)
            {
			var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
    
            // add only accounts with identity
            if(account.defaultIdentity) 
                {
                var item = document.getElementById("gnomeintegrationaccountlist").appendItem(account.incomingServer.prettyName);
                if(selected.indexOf(account.incomingServer.prettyName) != -1)
                    document.getElementById("gnomeintegrationaccountlist").addItemToSelection(item);
                }
            }

		// disables account list if no explicit account selected (all accounts)
		if(selected == '') this.toggleEnable('accounts');
		// if there are any selected account, checkbox must be checked
		else document.getElementById("gnomeintegrationaccounts").checked = true;
		},

	/**
	 * Saves user preferences
	 */
	accept: function(close)
		{
		// for each field, get its value
		var title = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		title.data = document.getElementById("gnomeintegrationtitle").value;

		var message = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		message.data = document.getElementById("gnomeintegrationmessage").value;

		var command = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		command.data = document.getElementById("gnomeintegrationcommand").value;

		var timeout = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		timeout.data = document.getElementById("gnomeintegrationtimeout").value;

		var sound = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		sound.data = document.getElementById("gnomeintegrationsound").value;

		var player = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		player.data = document.getElementById("gnomeintegrationplayer").value;

		var icon = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		icon.data = document.getElementById("gnomeintegrationicon").value;

		var tray = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		tray.data = document.getElementById("gnomeintegrationtray").checked ? "yes" : "no";

		var gravatar = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		gravatar.data = document.getElementById("gnomeintegrationgravatar").checked ? "yes" : "no";

		var notify = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		notify.data = document.getElementById("gnomeintegrationnotify").checked ? "yes" : "no";

		var accounts = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
		accounts.data = '';

		var selected = document.getElementById("gnomeintegrationaccountlist").selectedItems;
		for(var i = 0; i < selected.length; i++) accounts.data += selected[i].label + ';';

		// validation variables
		if(command.data != '')
			{
			var exec = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			exec.initWithPath(command.data)
			}

		var t = parseInt(timeout.data);

		// timeout must be an integer
		if(isNaN(t) == true || timeout.data != t || timeout.data.toString() != t.toString() || t < 1 || t > 60)
			{
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			prompts.alert(null, this.lang("gnomeintegration.error.title"), this.lang("gnomeintegration.error.timeout"));
			document.getElementById("gnomeintegrationtimeout").focus();
			return false;
			}
		// notify command must exists or be empty
		else if(command.data != '' && exec.exists(command.data) == false)
			{
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			prompts.alert(null, this.lang("gnomeintegration.error.title"), this.lang("gnomeintegration.error.binary"));
			document.getElementById("gnomeintegrationcommand").focus();
			return false;
			}
		// if there's no error, save preferences an close option window if is not a test
		else
			{
			this.preferences.setComplexValue("extensions.gnomeintegration.title", Components.interfaces.nsISupportsString, title);
			this.preferences.setComplexValue("extensions.gnomeintegration.message", Components.interfaces.nsISupportsString, message);
			this.preferences.setComplexValue("extensions.gnomeintegration.command", Components.interfaces.nsISupportsString, command);
			this.preferences.setComplexValue("extensions.gnomeintegration.timeout", Components.interfaces.nsISupportsString, timeout);
			this.preferences.setComplexValue("extensions.gnomeintegration.sound", Components.interfaces.nsISupportsString, sound);
			this.preferences.setComplexValue("extensions.gnomeintegration.player", Components.interfaces.nsISupportsString, player);
			this.preferences.setComplexValue("extensions.gnomeintegration.icon", Components.interfaces.nsISupportsString, icon);
			this.preferences.setComplexValue("extensions.gnomeintegration.tray", Components.interfaces.nsISupportsString, tray);
			this.preferences.setComplexValue("extensions.gnomeintegration.gravatar", Components.interfaces.nsISupportsString, gravatar);
			this.preferences.setComplexValue("extensions.gnomeintegration.notify", Components.interfaces.nsISupportsString, notify);
			this.preferences.setComplexValue("extensions.gnomeintegration.accounts", Components.interfaces.nsISupportsString, accounts);

			if(close == true) window.close();
			}

		return true;
		},

	/**
	 * Makes a test of notify
	 */
	test: function()
		{
		// before test, saves prefences
		this.accept(false);

		// generate test parameters
		var title = document.getElementById("gnomeintegrationtitle").value;
		var message = document.getElementById("gnomeintegrationmessage").value;
		var subject = this.lang("gnomeintegration.test.subject");
		var author = "Gnome Integration <author@gnome-integration.moz>";
		var recipients = this.lang("gnomeintegration.test.recipients") + " <recipient@gnome-integration.moz>";
		var carbonCopy = this.lang("gnomeintegration.test.carboncopy");
		var folder = this.lang("gnomeintegration.test.folder");
		var server = this.lang("gnomeintegration.test.server");
		var account = 'gnomeIntegrationTest';
		var priority = 1;
		var messageSize = 16384
		var lineCount = 128;
		var messageID = "test@id.com";

		// call notify function
		gnomeIntegration.notify(title, message, subject, author, recipients, carbonCopy, (new Date()).getTime(), folder, server, priority, messageSize, lineCount, messageID, account, true);
		},

	/**
	 * Opens an URL into Gnome default web browser
	 *
	 * @param	string	url
	 */
	openLink: function(url)
		{
		// try to locate gnome-open binary
		var exec = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		exec.initWithPath(gnomeIntegration.which('gnome-open'));

		// if exists gnome-open binary, launch browser
		if(exec.exists())
			{
			var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
			var args = [ url ];
			process.init(exec);
			var exitvalue = process.run(false, args, args.length);
			}
		// error if doesn't exists
		else
			{
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			prompts.alert(null, this.lang("gnomeintegration.error.title"), this.lang("gnomeintegration.error.launchbrowser"));
			}

		// stop default link action
		event.stopPropagation();

		return true;
		},

	/**
	 * Enables or disables notify preferences
	 */
	toggleEnable: function(tab)
		{
		if(tab == undefined || tab == 'general')
			 var controls = [ 'title', 'message', 'command', 'timeout', 'sound', 'soundbrowse', 'icon', 'iconbrowse', 'gravatar' ];
		else if(tab == 'accounts')
			 var controls = [ 'accountlist' ];
		else var controls = [];

		for(var i = 0; i < controls.length; i++)
			{
			var control = "gnomeintegration" + controls[i];
			var status = document.getElementById(control).disabled;
			document.getElementById(control).disabled = !status;

			if(typeof(document.getElementById(control).clearSelection) == 'function')
				document.getElementById(control).clearSelection();
			}
		},

	/**
	 * Open a dialog to select files
	 */
	browseFile: function(target)
		{
		var nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

		fp.init(window, "Open File", nsIFilePicker.modeOpen);
		if(fp.show() == nsIFilePicker.returnOK)
			{
			var path = fp.file.path;
			document.getElementById("gnomeintegration" + target).value = path;
			}
		},


	/**
	 * Returns a preference value
	 *
	 * @param	string	pref
	 * @return	string
	 */
	pref: function(pref)
		{
		return this.preferences.getComplexValue(pref, Components.interfaces.nsISupportsString).data;
		},

	/**
	 * Returns the translation of an string
	 *
	 * @param	string	string
	 * @return	string
	 */
	lang: function(string)
		{
		return this.bundle.GetStringFromName(string);
		}
	}

window.addEventListener("load", function() { gnomeIntegrationOptions.init(); }, true);