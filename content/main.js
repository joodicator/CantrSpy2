/* -- PHASE 1: APPLICATION INVOCATION -- */

var settings = {};

function invokeEvent (event) {
	// Retrieve arguments supplied to the application on first invocation only
	settings.debug = (event.arguments.indexOf("debug") >= 0);
    settings.trace = (event.arguments.indexOf("trace") >= 0);
	if (settings.debug) { air.trace("DEBUGGING MODE ENABLED"); }
	nativeApplication.removeEventListener(air.InvokeEvent.INVOKE, invokeEvent);

	appInit();
}
nativeApplication.addEventListener(air.InvokeEvent.INVOKE, invokeEvent);

/* -- PHASE 2: INITIALISATION -- */

var updater;

function appInit () {
	// Set up the initial application environment and define settings
	if (settings.debug) {
		settings.server = "joo.uk.to";
		settings.updateInterval = 10000;
	} else {
		settings.server = "intro.cantr.net";
		settings.updateInterval = 90000;
	}
	settings.protocolVersion = "1.1.0.";
    settings.updateKey = "2014";
    settings.clickThreshold = 500;
    settings.flashPeriod = 1000;
	settings.defaultURLScheme = "https";
    settings.defaultLocaleChain = localizer.getLocaleChain();
    
	var node = new DOMParser().parseFromString(nativeApplication.applicationDescriptor, "text/xml");
	node = node.getElementsByTagName("application")[0].getElementsByTagName("version")[0];
	settings.version = node.textContent;
    
    // Initialise locale
    var locale = configurationManager.get("locale", "default"),
        chain = settings.defaultLocaleChain;
    if (locale !== "default") {
        chain = chain.filter(function (l) { return (l !== locale); }, this);
        chain.unshift(locale);
    }
    localizer.setLocaleChain(chain);
    
    // Initiate garbage collection process
    window.setInterval(method(air.System, air.System.gc), Math.floor(settings.updateInterval / 4));
    
    // Initialise update framework
    if (configurationManager.get("autoUpdate", true)) checkForUpdate(false);

	appStart();
}

function checkForUpdate (visible) {
    // Initialise updater object if it does not exist
    var creating = (updater === undefined);
    if (creating) {
        updater = new air.ApplicationUpdaterUI;
        if (settings.debug) updater.updateURL = "http://joo.freehostia.com/cs_intro_update.xml";
        else updater.updateURL =
            "http://joo.freehostia.com/cantrspy/intro?update=" + settings.version +
            "&key=" + settings.updateKey;
        updater.addEventListener("updateStatus", function (event) { nativeApplication.dispatchEvent(event); });
        updater.addEventListener("updateError", function (event) { nativeApplication.dispatchEvent(event); });
        updater.addEventListener(air.UpdateEvent.INITIALIZED, function (event) {
            event.target.removeEventListener(event.type, arguments.callee);
            updater.checkNow();
        });
    }
    
    // Set up user interface based on parameters
    updater.isCheckForUpdateVisible = false;
    updater.addEventListener(air.StatusUpdateEvent.UPDATE_STATUS, function (event) {
        updater.removeEventListener(event.type, arguments.callee);
        updater.isCheckForUpdateVisible = visible;
    });
    
    // Begin update sequence
    if (creating) updater.initialize();
    else if (!updater.hasEventListener(air.UpdateEvent.INITIALIZED)) {
        if (updater.isUpdateInProgress) updater.cancelUpdate();
        updater.checkNow();
    }
}
nativeApplication.addEventListener("checkForUpdate", function () { checkForUpdate(true); });

/* -- PHASE 3: USER AUTHENTICATION -- */

var credentials; // Holder for authentication data from login window

function appStart () {
    // Open trace window if trace mode is active
    if (settings.trace) windowManager.createWindow("trace", "trace.htm", true, true);
    
    // Open the ticks window if the user has chosen to do so.
    if (configurationManager.get("ticksAutoOpen", false)) {
        showTicks();
    }

    // Look for previously saved credentials
    var id = configurationManager.get("credentials.playerID");
    var pw = configurationManager.get("credentials.password");
    if (id && pw) {
        // Initialise application icon to indicate application presence
        menuManager.appIcon.setMenu("locked");
        iconManager.setIcon("blank");
        iconManager.setTooltip(["trayTooltips", "connecting"]);

        // Attempt to log in with credentials
        credentials = { id:id, pw:pw };
        loginEvent();
    } else {
        // Otherwise create the login window to request manual input
        windowManager.createWindow("login", "login.htm");
    }    
}

/* -- PHASE 4: SERVER FEEDBACK -- */

function loginEvent () {
	// The user's credentials have been successfully submitted
	// Set up status indicators and begin communicating with the server

	menuManager.appIcon.setMenu("main");

	// Initiate the routine which retrieves and processes updates from the server
	updateManager.initialise(credentials);
	requestManager.playerPage.initialise(credentials);
	delete credentials;
}
nativeApplication.addEventListener("login", loginEvent);

function showTicks () {
    if ("tickTimings" in windowManager) {
        windowManager.tickTimings.activate();
    } else {
        windowManager.createWindow("tickTimings", "ticks.htm", true);
    }
}
nativeApplication.addEventListener("showTicks", showTicks);

function showSettings () {
    if ("settings" in windowManager) {
        windowManager.settings.activate();
    } else {
        windowManager.createWindow("settings", "settings.htm");
    }
}
nativeApplication.addEventListener("showSettings", showSettings);

function logout () {
    nativeApplication.dispatchEvent(new air.Event("logout"));
    iconManager.setIcon(); menuManager.appIcon.setMenu();
    windowManager.createWindow("login", "login.htm");
}


/* -- FINAL PHASE: APPLICATION SHUTDOWN -- */

function appExit () {
    nativeApplication.dispatchEvent(new air.Event(air.Event.EXITING));
    nativeApplication.exit();
}
nativeApplication.addEventListener("appExit", appExit);
