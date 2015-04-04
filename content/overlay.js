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

// from nsMsgFolderFlags.h
const GNOMEINTEGRATION_MSG_FOLDER_FLAG_TRASH 			= 0x00000100;
const GNOMEINTEGRATION_MSG_FOLDER_FLAG_JUNK 			= 0x40000000;
const GNOMEINTEGRATION_MSG_FOLDER_FLAG_SENTMAIL 		= 0x00000200;
const GNOMEINTEGRATION_MSG_FOLDER_FLAG_IMAP_NOSELECT 	= 0x01000000;
const GNOMEINTEGRATION_MSG_FOLDER_FLAG_CHECK_NEW 		= 0x20000000;
const GNOMEINTEGRATION_MSG_FOLDER_FLAG_INBOX 			= 0x00001000;

// from nsMsgMessageFlags.h
const GNOMEINTEGRATION_MSG_FLAG_NEW 					= 0x00010000;

/*
 * Displays a notification using libnotify when a new message is received
 *
 * @see		http://www.galago-project.org/specs/notification/0.9/index.html
 * @author	David Martinez <gnomeintegration@davidmartinez.net>
 */

var gnomeIntegration =
	{
	/**
	 *
	 **/
	uuid: 'gnomeintegration@davidmartinez.net',

	/**
	 *
	 **/
	bundle: null,

	/**
	 *
	 **/
	preferences: null,

	/**
	 * variable to store concurrent notifications
	 **/
	concurrent: [],

	/**
	 * Adds the listener to detect incoming mail
	 */
	load: function(event)
		{
		// initialization code
		this.initialized = true;
		this.strings = document.getElementById("gnomeintegration-strings");

		// adds a listener which will be called only when a message is added to the folder (Thunderbird 2.0)
		if(this.isLegacy())
			{
			var notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
			notificationService.addListener(gnomeIntegrationListener);
			}
		// adds a listener which will be called only when a message is added to the folder (Thunderbird 3.0)
		else
			{
			var notificationService =  Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);
			notificationService.addListener(gnomeIntegrationListener, notificationService.msgAdded);
			}

		// check if exists cache folder
		this.checkCache();

		// load common classess
		this.preferences = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		this.bundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://gnomeintegration/locale/gnomeintegration.properties");
		},

	/**
	 * Shows the notification
	 * 
	 * @see	http://www.galago-project.org/specs/notification/0.9/index.html
	 */
	notify: function(titleFormat, messageFormat, subject, author, recipients, carbonCopy, date, folder, server, priority, messageSize, lineCount, messageID, account, item)
		{
		// reads extension preferences
		var command = this.pref("extensions.gnomeintegration.command");
		var timeout = this.pref("extensions.gnomeintegration.timeout") * 1000;
		var sound = this.pref("extensions.gnomeintegration.sound");
		var player = this.pref("extensions.gnomeintegration.player");
		var icon = this.pref("extensions.gnomeintegration.icon");
		var tray = this.pref("extensions.gnomeintegration.tray");
		var gravatar = this.pref("extensions.gnomeintegration.gravatar");

		// tries to get avatar if enabled
		if(gravatar == 'yes' && author.search(/.+<.+@.+\.[a-z]+>/) != -1)
			{
			var split = author.split(' <');
			var mail = split[1].replace('>', '');

			gravatar = this.getGravatar(mail);

			if(gravatar != false) icon = gravatar;
			}

		// generates title and message
		var title = this.format(titleFormat, subject, author, recipients, carbonCopy, date, folder, server, priority, messageSize, lineCount, messageID, account, false);
		var message = this.format(messageFormat, subject, author, recipients, carbonCopy, date, folder, server, priority, messageSize, lineCount, messageID, account, true);

		// strings are (hopefully) in UTF-16 -> convert them to UTF-8
		var uc = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
		createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		uc.charset = "UTF-8";
		title = uc.ConvertFromUnicode(title) + uc.Finish();
		message = uc.ConvertFromUnicode(message) + uc.Finish();

		// priority (1 = normal, 2 = low, 3 = very low, 5 = high, 6 = very high)
		var urgency = (priority > 4) ? 'critical' : ((priority > 1) ? 'low' : 'normal');

		// check for duplicated notifications and limits
		if(this.checkNotify(account, messageID, timeout) == true)
			{
			// shows icon in system tray if speficied
			if(tray == 'yes') this.notifyTray();

			// generate arguments for notifier
			var args = [title, message, "-i", icon, "-c", "email.arrived", "-t", timeout, "-u", urgency, "-h", "int:transient:1"];
			if(sound != '' && player == 'libnotify') 
				{
				args[args.length] = "-h";
				args[args.length] = "string:sound-file:" + sound;
				}
			
			// shows the notification
			this.notifyBinary(args, command);
			
			// if sound player isn't native, plays sound
			if(player != 'libnotify') this.notifySound(sound, player);
			}
		},

	/**
	 * Notify on tray
	 *
	 * @param	array	args
	 */
	notifyTray: function(icon)
		{
		var path = this.which('zenity');
		var args = ['--notification', '--window-icon', this.pref("extensions.gnomeintegration.icon"), '--text', this.lang("gnomeintegration.message.new")];

		this.exec(path, args);
		},

	/**
	 * Notification with binary notify-send
	 *
	 * @param	array	args
	 */
	notifyBinary: function(args, command)
		{
		this.exec(command, args, "gnomeintegration.error.binary");
		},

	/**
	 * Plays a sound using external players
	 *
	 * @see		https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsISound
	 * @param	string	sound
	 * @param	strign	player
	 */
	notifySound: function(sound, player)
		{
		// system sound, uses XPCOM
		if(player == 'system')
			{
			var isound = Components.classes["@mozilla.org/sound;1"].createInstance(Components.interfaces.nsISound);
			var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
			var url = ios.newURI('file://' + sound, null, null);

			isound.init();
			isound.play(url);
			}
		// external player, executes
		else if(player != 'libnotify')
			{
			var path = this.which(player);
			var args = [];

			switch(player)
				{
				// canberra-gtk-play
				case 'canberra':
					path = this.which('canberra-gtk-play');
					args = [ "--file=" + sound ];
					break;

				// mplayer no-gui
				case 'mplayer':
					args = [ sound ];
					break;

				// default: sox
				default:
					path = this.which('play');
					args = [ sound ];
				}

			return this.exec(path, args);
			}
		},

	/**
	 * Check if there are too many notifications at the same time or duplicated ones
	 * Also checks if notifications for this account are disabled
	 *
	 * @param	string	acc
	 * @param	string	id
	 * @param	int		timeout
	 * @return	bool
	 */
	checkNotify: function(acc, id, timeout)
		{
		var can_notify = false;

		// check if there are more than 5 notifications in screen
		if(this.concurrent.length < 5)
			{
			// check if is is a duplicated notification
			var in_screen = false;
			for(var k in this.concurrent)
				if(this.concurrent[k] == id)
					in_screen = k;

			// not duplicated
			if(in_screen == false)
				{
				// adds identifier to concurrent list
				this.concurrent[this.concurrent.length] = id;

				// set timeout for cleaning ID in concurrent list
				setTimeout("gnomeIntegration.clearConcurrent('" + id + "')", timeout);

				// get selected accounts
				var selected = this.pref("extensions.gnomeintegration.accounts");

				// if user selected some accounts
				if(selected != '' && acc != 'gnomeIntegrationTest')
					{
					// evaluates all acounts
  					var accounts = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager).accounts;
                    var accountCount = accounts.queryElementAt ? accounts.length : accounts.Count();                    
					for (var i = 0; i < accountCount; i++)
						{
						// if current account is in selected list, can notify
						var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
						if(acc == account.key && selected.indexOf(account.incomingServer.prettyName + ';') != -1)
							{
							can_notify = true;
							break;
							}
						}
					}
				// empty value, all acounts
				else can_notify = true;
				}
			}

		return can_notify;
		},

	/**
	 * Deletes ID of a message from concurrent list
	 *
	 * @param	string	id
	 */
	clearConcurrent: function(id)
		{
		// locates message ID in array
		var key = false;
		for(var k in this.concurrent)
			if(this.concurrent[k] == id)
				key = k;

		// deletes the specified index
		if(key != false)
			{
			var temp_array = [];
			for(k in this.concurrent)
				if(k != key) temp_array[k] = this.concurrent[k];

			this.concurrent = temp_array;
			}
		},

	/**
	 * Formats all parameters based on user-defined preferences
	 */
	format: function(format, subject, author, recipients, carbonCopy, date, folder, server, priority, messageSize, lineCount, messageID, account, entities)
		{
		// we need author name and mail separated
		var author_name = null;
		var author_mail = null;
		if(author.search(/.+<.+@.+\.[a-z]+>/) != -1)
			{
			var split = author.split(' <');
			var author_name = split[0];
			var author_mail = split[1].replace('>', '');
			}

		if(author_name == null || author_name == '') author_name = author;
		if(author_mail == null || author_mail == '') author_mail = author;

		// convert entities for "body" (no needed for "title")
		if(entities == true)
			{
			subject = subject.replace('<', '&lt;').replace('>', '&gt;');
			author = author.replace('<', '&lt;').replace('>', '&gt;');
			recipients = recipients.replace('<', '&lt;').replace('>', '&gt;');
			carbonCopy = carbonCopy.replace('<', '&lt;').replace('>', '&gt;');
			}

		// replaces %X with variable
		var formatSplit = format.split(/(%[sarcdfvpbklimnu%])/);

		for (var i = 0; i < formatSplit.length; i++)
			{
			switch (formatSplit[i])
				{
				case "%s":
					formatSplit[i] = subject
					break;
				case "%a":
					formatSplit[i] = author
					break;
				case "%m":
					formatSplit[i] = author_mail;
					break;
				case "%n":
					formatSplit[i] = author_name;
					break;
				case "%r":
					formatSplit[i] = recipients
					break;
				case "%c":
					formatSplit[i] = carbonCopy
					break;
				case "%d":
					formatSplit[i] = (new Date(date)).toLocaleString();
					break;
				case "%f":
					formatSplit[i] = folder;
					break;
				case "%v":
					formatSplit[i] = server;
					break;
				case "%p":
					formatSplit[i] = priority;
					break;
				case "%b":
					formatSplit[i] = messageSize;
					break;
				case "%k":
					formatSplit[i] = Math.round(messageSize / 1000);
					break;
				case "%l":
					formatSplit[i] = lineCount;
					break;
				case "%i":
					formatSplit[i] = messageID;
					break;
				case "%u":
					formatSplit[i] = account;
					break;
				case "%%":
					formatSplit[i] = "%";
					break;
				}
			}

		return formatSplit.join("");
		},

	/**
	 * Gets the Gravatar of an user
	 *
	 * @see		https://developer.mozilla.org/en/Code_snippets/Downloading_Files
	 * @see		https://developer.mozilla.org/en/Code_snippets/File_I%2f%2fO#Writing_to_a_file
	 * @param	string	mail
	 * @return	string
	 */
	getGravatar: function(mail)
		{
		var icon = false;

		// generates Gravatar URL
		var hash = gnomeIntegration.hash(mail.toLowerCase());
		var url = 'http://www.gravatar.com/avatar/' + hash + '?s=48&d=404';

		var ioserv = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var channel = ioserv.newChannel(url, 0, null);
		var stream = channel.open();

		// tries to download the file from Gravatar servers (response 404 if not found)
		if(channel instanceof Components.interfaces.nsIHttpChannel && channel.responseStatus == 200)
			{
			var size = 0;
			var content = "";
			var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].createInstance(Components.interfaces.nsIBinaryInputStream);

			// download image
			bstream.setInputStream(stream);
			while(size = bstream.available())
				content += bstream.readBytes(size);

			// if download completed ok
			if(content.length > 0 && this.checkCache())
				{
				// path to cache file
				const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
				var cache = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;
				var path = cache + "/extensions/" + this.uuid + "/cache/" + hash + '.jpg';

				try
					{
					// saves image to file
					var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
					file.initWithPath(path);
					if(file.exists() == false) file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
					var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
					outputStream.init( file, 0x04 | 0x08 | 0x20, 420, 0 );
					var result = outputStream.write(content, content.length);
					outputStream.close();

					// returns path
					icon = path;
					}
				catch (e)
					{
					icon = false;
					}
				}
			}

		return icon;
		},

	/**
	 * Detects if Thunderbird version is 2.0 or 3.0
	 *
	 * @return bool
	 */
	isLegacy: function()
		{
		var version;
		if("@mozilla.org/xre/app-info;1" in Components.classes)  version = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo).version;
		else version = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch).getCharPref("app.version");

		var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);

		return !(versionChecker.compare(version, "3.0") >= 0);
		},

	/**
	 * Check if cache folder exists and if not, create
	 *
	 * @return bool
	 */
	checkCache: function()
		{
		var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
		file.append("extensions");
		file.append(this.uuid);
		file.append("cache");

		if(!file.exists() || !file.isDirectory())
			file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);

		return (file.exists() && file.isDirectory());
		},

	/**
	 * Run a command
	 *
	 * @param	string	path		full path to executable file
	 * @param	array	args		array of arguments (space-splitted command-line options)
	 * @param	string	message		message to show if executable does not exists
	 * @return	null
	 */
	exec: function(path, args, message)
		{
		if(path.indexOf('/') == -1) path = this.which(path);
		if(args == undefined) args = [];

		var exec = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		exec.initWithPath(path);

		if(exec.exists() == true)
			{
			var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);

			process.init(exec);
			process.run(false, args, args.length);
			}
		// if doesn't exists, shows an error if defined
		else if(message != undefined)
			{
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
			prompts.alert(null, this.bundle.GetStringFromName("gnomeintegration.error.title"), this.bundle.GetStringFromName(message));
			}

		return null;
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
		},

	/**
	 * Simulates which system command to locate full path of an executable
	 *
	 * @param	string	executable
	 * @return	string
	 */
	which: function(executable)
		{
		var path = this.pref("extensions.gnomeintegration.path").split(':');

		var full_path = false;
		for(var i = 0; i < path.length; i++)
			{
			var exec = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			exec.initWithPath(path[i] + '/' + executable);

			if(exec.exists() == true)
				{
				full_path = path[i] + '/' + executable;
				break;
				}
			}

		return full_path;
		},

	/**
	 * System sleep emulation
	 *
	 * @param	int		milliseconds
	 */
	sleep: function(milliseconds)
		{
		var startTime = new Date().getTime(); // get the current time
		while (new Date().getTime() < startTime + milliseconds); // hog cpu
		},

	/**
	 * JavaScript md5() port of PHP function
	 *
	 * @see		http://phpjs.org/functions/md5:469
	 * @see		http://github.com/kvz/phpjs/raw/master/functions/strings/md5.js
	 * @param	string	str
	 * @return	string
	 */
	hash: function(str)
		{
		// http://kevin.vanzonneveld.net
		// +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
		// + namespaced by: Michael White (http://getsprink.com)
		// +    tweaked by: Jack
		// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// +      input by: Brett Zamir (http://brett-zamir.me)
		// +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// -    depends on: utf8_encode
		// *     example 1: md5('Kevin van Zonneveld');
		// *     returns 1: '6e658d4bfcb59cc13f96c14450ac40b9'

		var xl;

		var gnomeIntegration_rotateLeft = function (lValue, iShiftBits)
			{
			return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
			};

		var gnomeIntegration_addUnsigned = function (lX,lY)
			{
			var lX4,lY4,lX8,lY8,lResult;
			lX8 = (lX & 0x80000000);
			lY8 = (lY & 0x80000000);
			lX4 = (lX & 0x40000000);
			lY4 = (lY & 0x40000000);
			lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
			if (lX4 & lY4)
				{
				return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
				}

			if (lX4 | lY4)
				{
				if (lResult & 0x40000000)
					 return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
				else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
				}
			else return (lResult ^ lX8 ^ lY8);
			};

		var gnomeIntegration_F = function (x,y,z) {return (x & y) | ((~x) & z);};
		var gnomeIntegration_G = function (x,y,z) {return (x & z) | (y & (~z));};
		var gnomeIntegration_H = function (x,y,z) {return (x ^ y ^ z);};
		var gnomeIntegration_I = function (x,y,z) {return (y ^ (x | (~z)));};

		var gnomeIntegration_FF = function (a,b,c,d,x,s,ac)
			{
			a = gnomeIntegration_addUnsigned(a, gnomeIntegration_addUnsigned(gnomeIntegration_addUnsigned(gnomeIntegration_F(b, c, d), x), ac));
			return gnomeIntegration_addUnsigned(gnomeIntegration_rotateLeft(a, s), b);
			};

		var gnomeIntegration_GG = function (a,b,c,d,x,s,ac)
			{
			a = gnomeIntegration_addUnsigned(a, gnomeIntegration_addUnsigned(gnomeIntegration_addUnsigned(gnomeIntegration_G(b, c, d), x), ac));
			return gnomeIntegration_addUnsigned(gnomeIntegration_rotateLeft(a, s), b);
			};

		var gnomeIntegration_HH = function (a,b,c,d,x,s,ac)
			{
			a = gnomeIntegration_addUnsigned(a, gnomeIntegration_addUnsigned(gnomeIntegration_addUnsigned(gnomeIntegration_H(b, c, d), x), ac));
			return gnomeIntegration_addUnsigned(gnomeIntegration_rotateLeft(a, s), b);
			};

		var gnomeIntegration_II = function (a,b,c,d,x,s,ac)
			{
			a = gnomeIntegration_addUnsigned(a, gnomeIntegration_addUnsigned(gnomeIntegration_addUnsigned(gnomeIntegration_I(b, c, d), x), ac));
			return gnomeIntegration_addUnsigned(gnomeIntegration_rotateLeft(a, s), b);
			};

		var gnomeIntegration_convertToWordArray = function (str)
			{
			var lWordCount;
			var lMessageLength = str.length;
			var lNumberOfWords_temp1=lMessageLength + 8;
			var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
			var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
			var lWordArray=new Array(lNumberOfWords-1);
			var lBytePosition = 0;
			var lByteCount = 0;
			while(lByteCount < lMessageLength)
				{
				lWordCount = (lByteCount-(lByteCount % 4))/4;
				lBytePosition = (lByteCount % 4)*8;
				lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount)<<lBytePosition));
				lByteCount++;
				}

			lWordCount = (lByteCount-(lByteCount % 4))/4;
			lBytePosition = (lByteCount % 4)*8;
			lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
			lWordArray[lNumberOfWords-2] = lMessageLength<<3;
			lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
			return lWordArray;
			};

		var gnomeIntegration_wordToHex = function (lValue)
			{
			var wordToHexValue="",wordToHexValue_temp="",lByte,lCount;
			for (lCount = 0;lCount<=3;lCount++)
				{
				lByte = (lValue>>>(lCount*8)) & 255;
				wordToHexValue_temp = "0" + lByte.toString(16);
				wordToHexValue = wordToHexValue + wordToHexValue_temp.substr(wordToHexValue_temp.length-2,2);
				}

			return wordToHexValue;
			};

		var gnomeIntegration_utf8_encode = function(argString)
			{
			// http://kevin.vanzonneveld.net
			// +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
			// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
			// +   improved by: sowberry
			// +    tweaked by: Jack
			// +   bugfixed by: Onno Marsman
			// +   improved by: Yves Sucaet
			// +   bugfixed by: Onno Marsman
			// +   bugfixed by: Ulrich
			// *     example 1: utf8_encode('Kevin van Zonneveld');
			// *     returns 1: 'Kevin van Zonneveld'

			var string = (argString+''); // .replace(/\r\n/g, "\n").replace(/\r/g, "\n");

			var utftext = "";
			var start, end;
			var stringl = 0;

			start = end = 0;
			stringl = string.length;
			for (var n = 0; n < stringl; n++)
				{
				var c1 = string.charCodeAt(n);
				var enc = null;

				if (c1 < 128) end++;
				else if (c1 > 127 && c1 < 2048)
					enc = String.fromCharCode((c1 >> 6) | 192) + String.fromCharCode((c1 & 63) | 128);
				else enc = String.fromCharCode((c1 >> 12) | 224) + String.fromCharCode(((c1 >> 6) & 63) | 128) + String.fromCharCode((c1 & 63) | 128);

				if (enc !== null)
					{
					if (end > start)  utftext += string.substring(start, end);
					utftext += enc;
					start = end = n+1;
					}
				}

			if (end > start)  utftext += string.substring(start, string.length);

			return utftext;
			}

		var x=[],
			k,AA,BB,CC,DD,a,b,c,d,
			S11=7, S12=12, S13=17, S14=22,
			S21=5, S22=9 , S23=14, S24=20,
			S31=4, S32=11, S33=16, S34=23,
			S41=6, S42=10, S43=15, S44=21;

		str = gnomeIntegration_utf8_encode(str);
		x = gnomeIntegration_convertToWordArray(str);
		a = 0x67452301;b = 0xEFCDAB89;c = 0x98BADCFE;d = 0x10325476;

		xl = x.length;
		for (k=0;k<xl;k+=16)
			{
			AA=a;BB=b;CC=c;DD=d;
			a=gnomeIntegration_FF(a,b,c,d,x[k+0], S11,0xD76AA478);
			d=gnomeIntegration_FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
			c=gnomeIntegration_FF(c,d,a,b,x[k+2], S13,0x242070DB);
			b=gnomeIntegration_FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
			a=gnomeIntegration_FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
			d=gnomeIntegration_FF(d,a,b,c,x[k+5], S12,0x4787C62A);
			c=gnomeIntegration_FF(c,d,a,b,x[k+6], S13,0xA8304613);
			b=gnomeIntegration_FF(b,c,d,a,x[k+7], S14,0xFD469501);
			a=gnomeIntegration_FF(a,b,c,d,x[k+8], S11,0x698098D8);
			d=gnomeIntegration_FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
			c=gnomeIntegration_FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
			b=gnomeIntegration_FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
			a=gnomeIntegration_FF(a,b,c,d,x[k+12],S11,0x6B901122);
			d=gnomeIntegration_FF(d,a,b,c,x[k+13],S12,0xFD987193);
			c=gnomeIntegration_FF(c,d,a,b,x[k+14],S13,0xA679438E);
			b=gnomeIntegration_FF(b,c,d,a,x[k+15],S14,0x49B40821);
			a=gnomeIntegration_GG(a,b,c,d,x[k+1], S21,0xF61E2562);
			d=gnomeIntegration_GG(d,a,b,c,x[k+6], S22,0xC040B340);
			c=gnomeIntegration_GG(c,d,a,b,x[k+11],S23,0x265E5A51);
			b=gnomeIntegration_GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
			a=gnomeIntegration_GG(a,b,c,d,x[k+5], S21,0xD62F105D);
			d=gnomeIntegration_GG(d,a,b,c,x[k+10],S22,0x2441453);
			c=gnomeIntegration_GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
			b=gnomeIntegration_GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
			a=gnomeIntegration_GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
			d=gnomeIntegration_GG(d,a,b,c,x[k+14],S22,0xC33707D6);
			c=gnomeIntegration_GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
			b=gnomeIntegration_GG(b,c,d,a,x[k+8], S24,0x455A14ED);
			a=gnomeIntegration_GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
			d=gnomeIntegration_GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
			c=gnomeIntegration_GG(c,d,a,b,x[k+7], S23,0x676F02D9);
			b=gnomeIntegration_GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
			a=gnomeIntegration_HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
			d=gnomeIntegration_HH(d,a,b,c,x[k+8], S32,0x8771F681);
			c=gnomeIntegration_HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
			b=gnomeIntegration_HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
			a=gnomeIntegration_HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
			d=gnomeIntegration_HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
			c=gnomeIntegration_HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
			b=gnomeIntegration_HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
			a=gnomeIntegration_HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
			d=gnomeIntegration_HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
			c=gnomeIntegration_HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
			b=gnomeIntegration_HH(b,c,d,a,x[k+6], S34,0x4881D05);
			a=gnomeIntegration_HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
			d=gnomeIntegration_HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
			c=gnomeIntegration_HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
			b=gnomeIntegration_HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
			a=gnomeIntegration_II(a,b,c,d,x[k+0], S41,0xF4292244);
			d=gnomeIntegration_II(d,a,b,c,x[k+7], S42,0x432AFF97);
			c=gnomeIntegration_II(c,d,a,b,x[k+14],S43,0xAB9423A7);
			b=gnomeIntegration_II(b,c,d,a,x[k+5], S44,0xFC93A039);
			a=gnomeIntegration_II(a,b,c,d,x[k+12],S41,0x655B59C3);
			d=gnomeIntegration_II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
			c=gnomeIntegration_II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
			b=gnomeIntegration_II(b,c,d,a,x[k+1], S44,0x85845DD1);
			a=gnomeIntegration_II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
			d=gnomeIntegration_II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
			c=gnomeIntegration_II(c,d,a,b,x[k+6], S43,0xA3014314);
			b=gnomeIntegration_II(b,c,d,a,x[k+13],S44,0x4E0811A1);
			a=gnomeIntegration_II(a,b,c,d,x[k+4], S41,0xF7537E82);
			d=gnomeIntegration_II(d,a,b,c,x[k+11],S42,0xBD3AF235);
			c=gnomeIntegration_II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
			b=gnomeIntegration_II(b,c,d,a,x[k+9], S44,0xEB86D391);
			a=gnomeIntegration_addUnsigned(a,AA);
			b=gnomeIntegration_addUnsigned(b,BB);
			c=gnomeIntegration_addUnsigned(c,CC);
			d=gnomeIntegration_addUnsigned(d,DD);
			}

		var temp = gnomeIntegration_wordToHex(a)+gnomeIntegration_wordToHex(b)+gnomeIntegration_wordToHex(c)+gnomeIntegration_wordToHex(d);

		return temp.toLowerCase();
		}
	}

/**
 * Listener class
 *
 * @see	https://developer.mozilla.org/en/Extensions/Thunderbird/HowTos
 * @see	https://developer.mozilla.org/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/Open_Folder#Watch_for_New_Mail
 */
var gnomeIntegrationListener =
	{
	// legacy for Thunderbird 2.0
	itemAdded: function(item)
		{
		gnomeIntegrationListener.msgAdded(item, true);
		},

	// new listener for Thunderbird 3.0
	msgAdded: function(item, legacy)
		{
		// base variables
		if(typeof(Components) != 'undefined')
			{
			var notify = (gnomeIntegration.pref("extensions.gnomeintegration.notify") == 'yes');
			var header = item.QueryInterface(Components.interfaces.nsIMsgDBHdr);
			var folder = header.folder.QueryInterface(Components.interfaces.nsIMsgFolder);

			// basic variables to detect if is new and is spam
			var linux = (navigator.platform.indexOf('Linux') != -1);
			var is_new = (header.flags & GNOMEINTEGRATION_MSG_FLAG_NEW);
			var is_spam = (folder.flags & GNOMEINTEGRATION_MSG_FOLDER_FLAG_JUNK);

			// checks if this is really a new message which was added ("NEW" flag seems to be enough)
			if(linux && notify && is_new && !is_spam)
				{
				// gets title and message format strings
				var titleFormat = gnomeIntegration.pref("extensions.gnomeintegration.title");
				var messageFormat = gnomeIntegration.pref("extensions.gnomeintegration.message");

				var server = folder.server.QueryInterface(Components.interfaces.nsIMsgIncomingServer);

				// there is no decoded CC list attribute in a header object (is there any higher level function for this?)
				var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
				var addresses = {};
				var fullNames = {};
				var names = {};
				msgHeaderParser.parseHeadersWithArray(header.ccList, addresses, names, fullNames);
				var cclist = fullNames.value.join(", ");

				// calls the notify method
				gnomeIntegration.notify(titleFormat, messageFormat, header.mime2DecodedSubject, header.mime2DecodedAuthor, header.mime2DecodedRecipients, cclist, Math.round(header.date / 1000), folder.prettyName, server.prettyName, header.priority, header.messageSize, header.lineCount, header.messageId, header.accountKey, header);
				}
			}
		}
	};

window.addEventListener("load", function(e) {gnomeIntegration.load(e);}, false);