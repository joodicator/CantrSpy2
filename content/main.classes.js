/* Object windowManager
 *   DOMWindow createWindow(String url, Number width, Number height)
 */
var windowManager = {
    createWindow: function (name, url, resizable, scrollable) {
        // Creates a standard window and initiates loading of the given URL.
        // Returns the created DOMWindow object.
        var options = new air.NativeWindowInitOptions;
        options.maximizable = false;
        options.minimizable = true;
        options.resizable = !!resizable;
        var loader = air.HTMLLoader.createRootWindow(false, options, !!scrollable);
        this[name] = loader.window.nativeWindow;
        loader.window.opener = window;
        loader.window.nativeWindow.addEventListener("closeWindow", method(this, "closeWindow"))
        loader.window.nativeWindow.addEventListener(air.Event.CLOSING, function (event) {
            event.target.dispatchEvent(new air.Event("closeWindow"));
        })
        loader.load(new air.URLRequest(url));
        return loader.window.nativeWindow;
    },

    closeWindow: function (event) {
        // Removes a reference to a window if it has been closed
        for (var index in this) {
            if (this[index] == event.target) {
                delete this[index];
                event.target.close();
            }
        }
    }

};

/* Object updateManager
 *   void initialise(Object credentials)
 *   void refresh()
 *   void userUpdate()
 *   void stopFlashing()
 */
var updateManager = {

    destroy: function () {
        window.clearInterval(this.interval);
        delete this.credentials;
        delete this.phase;
        delete this.status;
        if (this.status = "updating") this.updateLoader.close();
        this.stopFlashing();
    },

    initialise: function (aCredentials) {        
        if (!(arguments.callee.called)) {
            // Stop from calling again
            arguments.callee.called = true;
            // Set to destroy on logout
            nativeApplication.addEventListener("logout", method(this, this.destroy));
            // Initialise URLRequest
			this.updateRequest = new air.URLRequest();
            this.updateRequest.cacheResponse = this.updateRequest.useCache = false;
            this.updateRequest.data = new air.URLVariables;
            this.updateRequest.data.ver = settings.protocolVersion;
            // Initialise URLLoader
            this.updateLoader = new air.URLLoader;
            this.updateLoader.dataFormat = air.URLLoaderDataFormat.TEXT;
            this.updateLoader.addEventListener(air.Event.COMPLETE, method(this, "updateEvent"));
            this.updateLoader.addEventListener(air.IOErrorEvent.IO_ERROR, method(this, "updateEvent"));
            this.updateLoader.addEventListener(air.SecurityErrorEvent.SECURITY_ERROR, method(this, "updateEvent"));
            if (settings.trace) {
                this.updateLoader.addEventListener(air.Event.OPEN, method(this, function () {
                    var action = this.updateRequest.url + "?" + this.updateRequest.data.toString();
                    var headers = "User-Agent: " + this.updateRequest.userAgent + "\n";
                    for (var i=0; i < this.updateRequest.requestHeaders.length; ++i) {
                        var header = this.updateRequest.requestHeaders[i];
                        headers += header.name + ": " + header.value + "\n";
                    }
                    trace(action + "\n\n" + headers, "request");
                }));
                this.updateLoader.addEventListener(air.Event.COMPLETE, method(this, function () {
                    trace(this.updateLoader.data.toString(), "response");
                }));
            }
        }

        this.oldNames = [];
        this.flashNames = [];
        this.flashTimeouts = [];
        this.status = "idle";

        // Initialise user-configurable variables
        this.refresh();

        // Retrieve a public key from the server to initialise an update session
        this.credentials = aCredentials;

        if ('pass' in this.updateRequest.data) delete this.updateRequest.data.pass;
        this.updateRequest.data.id = this.credentials.id;
        this.updateRequest.data.requestkey = "1";

        this.phase = "requesting_key";
        this.interval = window.setInterval(function () { updateManager.update(); }, settings.updateInterval);
        this.update();
    },

    refresh: function () {
        if (this.status == "idle") {
            var scheme = configurationManager.get("urlScheme", settings.defaultURLScheme);
            this.updateRequest.url = scheme + "://" + settings.server + "/app.getevents2.php";
            this.refreshLater = false;
        } else {
            this.refreshLater = true;
        }
    },

    userUpdate: function () {
        if ((this.status == "idle") && (this.phase = "main")) {
            // Reset timer
            window.clearInterval(this.interval);
            this.interval = window.setInterval(function () { updateManager.update(); }, settings.updateInterval);

            // Indicate activity to user
            iconManager.setIcon("blank");
            iconManager.setTooltip(["trayTooltips", "connecting"]);

            // Invoke update
            this.update();
        }
    },

    update: function () {
        // Begin a new update request
        this.status = "updating";
        menuManager.appIcon.disable("updateNow");
        this.updateLoader.load(this.updateRequest);
    },

    updateEvent: function (event) {
        // Handle an event from the HTTPLoader
        switch (event.type) {
            case air.IOErrorEvent.IO_ERROR: case air.SecurityErrorEvent.SECURITY_ERROR:
                // A transmission error occured
                var message;
                switch (event.errorID) {
                    case 2032: message = ["trayTooltips", "errorConnect"]; break;
                    default: message = event.text;
                }
                iconManager.setIcon("error");
                iconManager.setTooltip(message);
                air.trace(event);
                break;

            case air.Event.COMPLETE:
                var data = event.target.data.replace(/^\s+|\s+$/g, "");
                if (this.phase == "requesting_key") {
                    try {
                        try {
                            // Attempt to parse the supplied public key details
                            data = /^([\dA-F]+)\n([\dA-F]+)\n(\d+)$/i.exec(data);
                            var publicKey = new jCryptionKeyPair(data[1], data[2], data[3]);
                            var pass = jCryptionEncrypt(publicKey, this.credentials.pw);
                        } catch (error) { throw "parse_fail"; }

                        delete this.updateRequest.data.requestkey;
                        this.updateRequest.data.pass = pass;

                        delete this.credentials;
                        this.phase = "main";

                        return this.update(); // Immediately attempt to authenticate
                    }
                    catch (error) { if (error == "parse_fail") {
                        // Parsing failed
                        iconManager.setIcon("error");
                        iconManager.setTooltip(["trayTooltips", "errorParse"]);
                    } else throw error; }
                }
                else {
                    // The update request completed successfully.
                    if (data && /^OK LIST/.test(data)) {
                        // The authentication was successful
                        var names = data.split("\n"); names.shift();
                        if (names.length > 0) {
                            // One or more character names were returned
                            if (names.length > 15) iconManager.setIcon("alert");
                            else iconManager.setIcon(names.length);
                            iconManager.setTooltip(
                                names.join(", "),
                                (names.length < 5)
                                    ? ["trayTooltips", "numChars_" + names.length]
                                    : ["trayTooltips", "numChars", [names.length]]
                            );
                        } else {
                            // No character names were returned
                            iconManager.setIcon("idle");
                            iconManager.setTooltip(["trayTooltips", "noChars"]);
                        }
                        // Check for characters in the new list who are not in the old list.
                        var newNames = names.filter(function (n) { return (this.indexOf(n) < 0) }, this.oldNames);
                        this.flashNames = this.flashNames.filter(
                            function (n) { return (this.indexOf(n) != -1); }, names).concat(newNames);
                        if (this.flashNames.length && configurationManager.get("flashIcon", false)) {
                            // Display an alert to the user depending on settings.
                            iconManager.startFlash();
                            if (configurationManager.get("flashTiming", "indefinite") == "definite") {
                                var callback = function () {
                                    this.flashNames = this.flashNames.filter(function (n) { return (newNames.indexOf(n) != -1); });
                                    if (this.flashNames.length == 0) iconManager.stopFlash();
                                    this.flashTimeouts.splice(this.flashTimeouts.indexOf(arguments.callee.timeoutID), 1)
                                };
                                this.flashTimeouts.push(callback.timeoutID = setTimeout(method(this, callback),
                                    configurationManager.get("flashDuration", 30) * 1000));
                            }
                        } else iconManager.stopFlash();
                        this.oldNames = names;
                    } else if ((data == "BAD LOGIN") || (data == "ERROR Hacking attempt")) {
                        // The login details were incorrect
                        if ("login" in windowManager) {
                            windowManager.login.dispatchEvent(new air.Event("badLogin"));
                            this.destroy();
                        } else {
                            iconManager.setIcon("error");
                            iconManager.setTooltip(["trayTooltips", "errorAuth"]);
                        }
                        var badLogin = true;
                    } else if (data && /^ERROR/.test(data)) {
                        // The server returned an error message
                        iconManager.setIcon("error");
                        iconManager.setTooltip(["trayTooltips", "error", [data.substr(6)]]);
                    } else if (data == "GAME LOCKED") {
                        // The game is locked.
                        iconManager.setIcon("locked");
                        iconManager.setTooltip(["trayTooltips", "gameLocked"])
                    } else {
                        // The response could not be interpreted
                        iconManager.setIcon("error");
                        iconManager.setTooltip(["trayTooltips", "errorParse"]);
                    }
                } break;

            default:
                // Unrecognised event, ignore
                if (settings.debug) air.trace(event);
                return;
        }

        // Manage the opened login window
        if (("login" in windowManager) && !badLogin) {
            windowManager.login.dispatchEvent(new air.Event("successfulLogin"));
        }

        this.status = "idle";
        if (this.refreshLater) this.refresh();
        menuManager.appIcon.enable("updateNow");
    },
    
    stopFlashing: function () {
        this.flashNames = [];
        this.flashTimeouts.forEach(clearTimeout);
        iconManager.stopFlash();
    }

};

/* Object menuManager
 *   Object appIcon
 *     void setMenu(context)
 *     void refresh()
 *     void enable(name)
 *     void disable(name)
 */
var menuManager = new function () {

    // Application icon context menu
    this.appIcon = new function () {
        nativeApplication.icon.menu = new air.NativeMenu;
        nativeApplication.icon.menu.addEventListener(air.Event.SELECT, method(this, "iconMenuSelectEvent"));

        this.currentContext = null;

        function put(id) {
            var i = new air.NativeMenuItem(localizer.getString("trayMenu", id));
            i.name = id;
            nativeApplication.icon.menu.addItem(i);
            return i;
        };

        this.setMenu = function (context) {
            this.currentContext = context;
            nativeApplication.icon.menu.removeAllItems();
            if (context !== null) {
                if (context == "main") {
                    put("openPlayerPage");
                    put("updateNow");
                    put("settings");
                    put("logout");
                }
                if (configurationManager.get("showTicks", false)) {
                    put("");
                    put("tickTimings");
                }
                if (air.NativeApplication.supportsSystemTrayIcon || iconManager.flashing) {
                    put("")
                    if (iconManager.flashing) put("stopFlashing");
                    if (air.NativeApplication.supportsSystemTrayIcon) put("exit");
                }
            }
        };

        this.refresh = function () {
            this.setMenu(this.currentContext);
        };
        nativeApplication.addEventListener("localeChanged", method(this, this.refresh));

        this.enable = function (name) {
            // Enable a named menu item
            var item = nativeApplication.icon.menu.getItemByName(name);
            if (item !== null) item.enabled = true;
        };

        this.disable = function (name) {
            // Disable a named menu item
            var item = nativeApplication.icon.menu.getItemByName(name);
            if (item !== null) item.enabled = false;
        };

        this.iconMenuSelectEvent = function (event) {
            // Responds to the selection of an icon menu item
            switch (event.target.name) {
                case "openPlayerPage":
                    requestManager.playerPage.open(); break;

                case "updateNow":
                    updateManager.userUpdate(); break;

                case "logout":
                    logout(); break;

                case "settings":
                    showSettings(); break;

                case "tickTimings":
                    showTicks(); break;

                case "stopFlashing":
                    updateManager.stopFlashing();
                    break;

                case "exit":
                    appExit();
            }
        };
    };
};


/* Object iconManager
 *   void setIcon(String name)
 *   void setTooltip(String primary, String secondary)
 *   void refresh()
 *   void startFlash()
 *   void stopFlash()
 */
var iconManager = new function () {

    // Initialise miscellaneous properties
    this.clickTimer = null; // timeout handle used to detect double-clicks
    this.request = new air.URLRequest; // URLRequest instance to be reused
    this.spareLoaders = Array(); // Already created loaders to be reused
    this.activeLoaders = Array(); // Loaders currently performing a download
    this.completed = Array(); // BitmapData instances which have been downloaded
    this.currentIcon = null; // Name of currently displayed icon
    this.nextIcon = null; // Icon to load after current loading is finished
    this.currentStyle = null; // Style of currently displayed icon
    this.cache = new Object; // The bitmapData of icon files that have been previously loaded
    this.sizes = [16, 24, 32, 48]; // All icon sizes.
    this.frozen = false; // Whether new icon change requests will always be queued.

    this.setIcon = function (name) {
        // Sets the array of icons specified by a string as the current tray icon.
        // If the icons have not finished loading, they will be set when they do.

        if (this.frozen) {
            this.frozenIcon = name;
            return;
        }

        if (this.activeLoaders.length != 0) {
            // Due to an apparent bug in air.Loader.close(), it is impossible to stop Loader objects
            // from progressing once they have been started; therefore, in the case that a new icon is
            // set while a previous one is still loading, the loading of the new icon will be delayed
            // until after the current one finishes.
            this.nextIcon = name;
            return;
        }

        // If no icon is currently loaded, the requested icon can be loaded as normal
        var iconStyle = configurationManager.get("iconStyle", "circle");
        if ((name !== this.currentIcon) || (iconStyle !== this.currentStyle)) {
            var currentStyle = iconStyle;
            if (name != null) {
                // The named icon exists; begin loading the corresponding files
                this.currentIcon = name;
                for (var index in this.sizes) {
                    var url = "app:/icons/" + iconStyle + "/" + this.sizes[index] + "px/" + name + ".png";
                    if (url in this.cache) {
                        // The bitmapData is already cached, so the icon does not need to be loaded
                        this.completed.push(this.cache[url]);
                    } else {
                        // Create a new Loader if no spares are available, otherwise use a spare Loader
                        if (this.spareLoaders.length == 0) {
                            var loader = new air.Loader;
                            loader.contentLoaderInfo.addEventListener(air.Event.COMPLETE, method(this, "loadComplete1"));
                            loader.contentLoaderInfo.addEventListener(air.IOErrorEvent.IO_ERROR, method(this, "loadComplete2"));
                        } else var loader = this.spareLoaders.pop();
                        // Initiate loading of the icon file
                        this.request.url = url;
                        loader.load(this.request);
                        this.activeLoaders.push(loader);
                    }
                }
                this.loadComplete3() // Check if the icon can immediately be displayed
            }
            else {
                // No existing icon is identified, so display no icon
                this.currentIcon = null;
                nativeApplication.icon.bitmaps = Array();
            }
        }
    };

    this.currentTooltip = [""];

    this.setTooltip = function () {
        // If supported, sets the tooltip string of the system tray icon.
        // Subsequent arguments can be used to provide shorter forms in case the previous strings do
        // not fit inside the maximum tooltip length.
        // Instead of a string, an array of arguments to be passed to localizer.getString may be used.
        this.currentTooltip = Array.prototype.slice.call(arguments);
        this.setLocalTooltip();
    };

    this.setLocalTooltip = function () {
        if (air.NativeApplication.supportsSystemTrayIcon) {
            for (var n = 0; n < this.currentTooltip.length; n++) {
                var localised = (this.currentTooltip[n] instanceof Array)
                    ? localizer.getString.apply(localizer, this.currentTooltip[n])
                    : this.currentTooltip[n];
                if ((localised.length <= air.SystemTrayIcon.MAX_TIP_LENGTH) || (n == (this.currentTooltip.length - 1))) {
                    nativeApplication.icon.tooltip = localised;
                    break;
                }
            }
        }
    };
    // Update the localised tooltip if the current locale changes.
    nativeApplication.addEventListener("localeChanged", method(this, this.setLocalTooltip));

    this.refresh = function (newStyle) {
        // When the iconStyle configuration entry is changed, this function can be called
        // to immediately load the new style of icon
        this.setIcon(this.nextIcon || this.currentIcon);
    };

    this.loadComplete1 = function (event) {
        // Handles the completed loading of a single icon file.
        this.completed.push(this.cache[event.target.url] = event.target.content.bitmapData);
        event.target.loader.unload();
        this.loadComplete2(event);
    };

    this.loadComplete2 = function (event) {
        // Called after a loader fails or by loadComplete1
        this.spareLoaders.push(this.activeLoaders.splice(this.activeLoaders.indexOf(event.target.loader), 1)[0]);
        this.loadComplete3();
    };

    this.loadComplete3 = function () {
        // Called by either loadComplete1 or loadComplete2 after a successful or failed load
        // or by setIcon when no icons need to be loaded
        if (this.activeLoaders.length == 0) {
            nativeApplication.icon.bitmaps = this.completed;
            this.completed = Array();
            if (this.nextIcon !== null) {
                // If a subsequent icon is queued, begin loading it
                this.setIcon(this.nextIcon);
                this.nextIcon = null;
            }
        }
    };

    if (air.NativeApplication.supportsSystemTrayIcon) {
        this.click = function () {
            if (this.clickTimer === null) {
                function clickTimeout () {
                    iconManager.clickTimer = null;
                    iconManager.singleClick();
                }
                this.clickTimer = window.setTimeout(clickTimeout, settings.clickThreshold);
            } else {
                window.clearTimeout(this.clickTimer);
                this.clickTimer = null;
                this.doubleClick();
            }
        };
        nativeApplication.icon.addEventListener(air.ScreenMouseEvent.CLICK, method(this, "click"));

        this.singleClick = function () {
            // If icon is currently flashing, stop it;
            if (iconManager.flashing) updateManager.stopFlashing();
            // Otherwise, update now.
            else updateManager.userUpdate();
        };

        this.doubleClick = function () {
            // Open player page
            requestManager.playerPage.open();
        };
    }

    this.flashing = false;

    this.startFlash = function () {
        if (!this.flashing) {
            this.flashing = true;
            menuManager.appIcon.refresh();
            this.flashOn();
        }
    };

    this.stopFlash = function () {
        if (this.flashing) {
            this.flashing = false;
            menuManager.appIcon.refresh();
            clearTimeout(this.flashTimeout);
            this.flashOn();
        }
    };

    this.flashOff = method(this, function () {
        this.frozenIcon = this.nextIcon || this.currentIcon;
        this.setIcon("blank");
        this.frozen = true;
        this.flashTimeout = setTimeout(this.flashOn, settings.flashPeriod);
    });

    this.flashOn = method(this, function () {
        if (this.frozen) {
            this.frozen = false;
            this.setIcon(this.frozenIcon);
        }
        if (this.flashing) this.flashTimeout = setTimeout(this.flashOff, settings.flashPeriod);
    });

};



/* Object requestManager
 *   Object playerPage
 *     void initialise(Object credentials)
 *     void refresh()
 *     void open(NativeMenuItem item)
 */
var requestManager = {
    playerPage: {

        initialise: function (aCredentials) {
            // Sets the object to use the specified username and password for login request
            // Must be called before open or after destroy

            if (!arguments.callee.called) {
                // Stop any subsequent executions
                arguments.callee.called = true;
                // Create URLRequest
				var scheme = configurationManager.get("urlScheme", settings.defaultURLScheme);
                this.request = new air.URLRequest();
                this.request.method = air.URLRequestMethod.POST;
                this.request.cacheResponse = false;
                this.request.useCache = false;
                this.request.manageCookies = false;
                this.request.followRedirects = false;
                this.request.data = new air.URLVariables;
                this.request.data.page = "login";
                this.request.data.data = "yes";
                // Create URLLoader
                this.loader = new air.URLLoader;
                this.loader.addEventListener(air.HTTPStatusEvent.HTTP_RESPONSE_STATUS, method(this, "httpResponse"));
                this.loader.addEventListener(air.Event.COMPLETE, method(this, "close"));
                this.loader.addEventListener(air.SecurityErrorEvent.SECURITY_ERROR, method(this, "close"));
                this.loader.addEventListener(air.IOErrorEvent.IO_ERROR, method(this, "close"));
                // Create secondary URLRequest
                this.subRequest = new air.URLRequest();
                this.subRequest.method = air.URLRequestMethod.GET;
                this.subRequest.data = new air.URLVariables;
                this.subRequest.data.page = "login";
                this.subRequest.data.data = "yes";
                // Set to close on logout
                nativeApplication.addEventListener("logout", method(this, "close"));
            }

            // Initialise URLRequest
            this.request.data.id = aCredentials.id;
            this.request.data.password = aCredentials.pw;

            // Initialise status
            this.status = "idle";

            // Initialise user-configurable variables
            this.refresh();
        },

        refresh: function () {
            // Respond to changes in any relevant configuration variables.
            if (this.status == "idle") {
                var scheme = configurationManager.get("urlScheme", settings.defaultURLScheme);
                this.request.url = this.subRequest.url = scheme + "://" + settings.server;
                this.refreshLater = false;
            } else {
                this.refreshLater = true;
            }
        },

        open: function () {
            if (this.status == "idle") {
                // Begins the process of logging in with the user's credentials
                // and opening their player page in a new browser window
                this.loader.load(this.request);
                this.status = "requesting";
                menuManager.appIcon.disable("playerPage");
            }
        },

        httpResponse: function (event) {
            // Handles the HTTP response from the player page request
            var SESSION = "40d0228e409c8b711909680cba94881c";
            var cookies = {};
            event.responseHeaders.forEach(function (header) {
                if (header.name == "Set-Cookie") {
                    header.value.split(";").forEach(function (cookie) {
                        cookie = cookie.split("=");
                        var value = (cookie.length < 2) ? null : cookie[1].trim();
                        cookies[cookie[0].trim()] = value;
                    });
                }
            });
            if (SESSION in cookies) {
                this.subRequest.data.session = cookies[SESSION];
                air.navigateToURL(this.subRequest);
            }
        },

        close: function () {
            // Cleans up after the HTTP request finishes
            this.status = "idle";
            if (this.refreshLater) this.refresh();
            menuManager.appIcon.enable("playerPage");
        }
    }
};

/* Object configurationManager
 *   void set(any name = undefined, any value, Boolean asynchronous = false)
 *   any get(any name, any defaultValue = undefined)
 */
var configurationManager = new function () {
    // Extend EventDispatcher class
    this.__proto__ = new air.EventDispatcher;

    // Initialise resident FileStream instance
    this.fileStream = new air.FileStream;
    this.streamOpen = false;
    this.openStream = function (fileMode) {
        this.fileStream.open(this.file, fileMode);
        this.streamOpen = true;
    }
    this.closeStream = function () {
        if (this.streamOpen) {
            this.fileStream.close()
            this.streamOpen = false;
        }
    }

    // Initialise File instance corresponding to configuration file
    this.file = air.File.applicationStorageDirectory.resolvePath("configuration.amf");
    if (this.file.exists) {
        // File already exists, load configuration into buffer
        try {
            this.openStream(air.FileMode.READ);
            this.buffer = this.fileStream.readObject();
            this.closeStream();
        } catch (error) {
            if ((error.name != "IOError") && (error.name != "EOFError")) throw error;
            // Operation failed, delete configuration file
            this.closeStream();
            this.file.deleteFile();
        }
    }
    if (!this.file.exists) {
        // File does not exist (or was deleted due to an error), create an empty buffer
        this.buffer = new Object;
    }

    this.get = function (name, defaultValue) {
        // Reads the value associated with a configuration entry name
        // Returns defaultValue if the entry does not exist
        // or undefined if neither exist
        if (!(name in this.buffer)) return defaultValue;
        return this.buffer[name];
    };

    this.set = function (name, value, asynchronous) {
        // Writes a configuration entry
        // If value is not specified, the entry is deleted
        if (value === undefined) delete this.buffer[name];
        else this.buffer[name] = value;

        if (asynchronous) {
            if (!this.commitPending) {
                this.commitPending = true;
                window.setTimeout(method(this, "commit"), 0);
            }
        } else {
            this.commitPending = true;
            this.commit();
        }
    };

    this.commit = function () {
        // Writes configuration changes to file
        if (!this.commitPending) return;
        this.commitPending = false;
        try {
            this.openStream(air.FileMode.WRITE);
            this.fileStream.writeObject(this.buffer);
        } catch (error) {
            if ((error.name != "IOError") && (error.name != "EOFError")) throw error;
        } finally { this.closeStream(); }
    };
    this.addEventListener("commit", method(this, "commit"));
    this.commitPending = false; // Flag indicating that a commit event has been dispatched or the commit function called
};
