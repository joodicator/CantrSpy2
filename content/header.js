// Contains standard declarations used by all HTML files

if ("air" in window) {
    // Local context
	var nativeApplication = air.NativeApplication.nativeApplication;
	var nativeWindow = window.nativeWindow;
	var htmlLoader = runtime.htmlLoader;
    var mainScreen = air.Screen.mainScreen;

	if ("Localizer" in air) {
		var localizer = air.Localizer.localizer;
	} else if ("localizer" in window.opener) {
        var localizer = window.opener.localizer;
    }

    // AIR Aliases
    air.errors = runtime.flash.errors;
    air.ScreenMouseEvent = runtime.flash.events.ScreenMouseEvent;
}

function method (object, member) {
    // Returns an event handler function which when called forwards the
    // invocation to a certain member of a certain object
    // - If member is a function, it is invoked in the context of object;
    //   otherwise, object[member] is invoked in the context of object.
    // - All arguments passed to the handler are forwarded to the member,
    //   after which all extra arguments passed to this function are included
    var postArguments = Array.prototype.slice.call(arguments, 2);
    if (typeof member == "function") return function () {
        return member.apply(object, Array.prototype.slice.call(arguments).concat(postArguments));
    };
    return function () {
        return object[member].apply(object, Array.prototype.slice.call(arguments).concat(postArguments));
    };
}

if (!("keys" in Object)) Object.keys = function (object) {
    var keys = [];
    for (var key in object) {
        if (object.hasOwnProperty(key)) keys.push(key);
    }
    return keys;
};

if (!("trim" in String.prototype)) String.prototype.trim = function () {
    return /^\s*(.*?)\s*$/.exec(this)[1];
};