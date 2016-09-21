var main = window.opener;

function updateLocale () {
	// Update localised strings.
	localizer.update(document);
    var headLocale = main.settings.defaultLocaleChain[0];
    lang_default.textContent = localizer.getString("settingsWindow", "osLocale",
        [localizer.getString("general", "lang_" + headLocale) || headLocale]);

    // Resize window to fit content.
	nativeWindow.stage.stageWidth = container.offsetWidth;
	nativeWindow.stage.stageHeight = container.offsetHeight;
}
nativeApplication.addEventListener("localeChanged", updateLocale);

nativeWindow.addEventListener("closeWindow", function (event) {
    event.target.removeEventListener(event.type, arguments.callee);
    nativeApplication.removeEventListener("localeChanged", updateLocale);
}, false, 1);

window.onload = function () {
    // Load languages and localised strings.
    var chain = main.settings.defaultLocaleChain;
    for (var n = 0; n < chain.length; n++) {
        if (/^\./.test(chain[n])) continue;
        var option = document.createElement("option");
        option.setAttribute("local_innerHTML", "general.lang_" + chain[n]);
        option.value = chain[n];
        lang_container.appendChild(option);
    }
    lang_container.value = main.configurationManager.get("locale", "default");
    lang_container.onchange = function () {
        var chain = main.settings.defaultLocaleChain;
        if (this.value !== "default") {
            chain = chain.filter(function (l) { return (l !== this.value); }, this);
            chain.unshift(this.value);
        }
        localizer.setLocaleChain(chain);
        main.configurationManager.set("locale", this.value)
        nativeApplication.dispatchEvent(new air.Event("localeChanged"));
    };
    updateLocale();
    
	// Centre window in screen.
	nativeWindow.x = mainScreen.bounds.x + ((mainScreen.bounds.width - nativeWindow.width) / 2);
	nativeWindow.y = mainScreen.bounds.y + ((mainScreen.bounds.height - nativeWindow.height) / 2);

    // Bind autoRun
    try {
        autoRun.checked = nativeApplication.startAtLogin;
        autoRun.onchange = function () { nativeApplication.startAtLogin = this.checked; };
    } catch (error) { autoRun.disabled = true; }
    
    // Bind autoUpdate
    autoUpdate.checked = main.configurationManager.get("autoUpdate", true);
    autoUpdate.onchange = function () { main.configurationManager.set("autoUpdate", this.checked) };
    
    // Bind checkNow
    function stopOnClose () { main.updater.cancelUpdate(); }
    
    checkNow.onclick = function (event) {
        this.disabled = true;
        updateIndicator.style.visibility = "visible";
        nativeWindow.addEventListener("closeWindow", stopOnClose, false, 1);
        nativeApplication.dispatchEvent(new air.Event("checkForUpdate"));
    };

    function updateStop () {
        checkNow.disabled = false;
        updateIndicator.style.visibility = "hidden";
        nativeWindow.removeEventListener("closeWindow", stopOnClose)
    }
    nativeApplication.addEventListener("updateStatus", updateStop);
    nativeApplication.addEventListener("updateError", updateStop);
    
    // Bind flashIcon
    flashIcon.checked = main.configurationManager.get("flashIcon", false)
    window["flash_" + main.configurationManager.get("flashTiming", "indefinite")].click();
    flashDuration.value = main.configurationManager.get("flashDuration", 30).toString();
    flashDuration.onchange = function () {
        var val = Math.max(0, parseInt(this.value)) || 0;
        this.value = val.toString();
        main.configurationManager.set("flashDuration", val);
    };
    flash_definite.onchange = function () {
        flashDuration.disabled = !this.checked;
        if (this.checked) main.configurationManager.set("flashTiming", "definite");
    };
    flash_indefinite.onchange = function () {
        flashDuration.disabled = this.checked;
        if (this.checked) main.configurationManager.set("flashTiming", "indefinite");
    };
    (flashIcon.onchange = function () {
        main.configurationManager.set("flashIcon", this.checked);
        flash_definite.disabled = flash_indefinite.disabled = !this.checked;
        flashDuration.disabled = !(this.checked && flash_definite.checked);        
    }).call(flashIcon);
    
    // Bind useSecure
    var scheme = main.configurationManager.get("urlScheme", main.settings.defaultURLScheme);
    useSecure.checked = (scheme == "https");
	useSecure.onchange = function () {
        var scheme = useSecure.checked ? "https" : "http";
        main.configurationManager.set("urlScheme", scheme);
        main.requestManager.playerPage.refresh();
        main.updateManager.refresh();
    };
    
    // Bind iconStyle
    window["iconStyle_" + main.configurationManager.get("iconStyle", "circle")].click();
    iconStyle_circle.onchange = iconStyle_square.onchange = function () {
        if (this.checked) {
            main.configurationManager.set("iconStyle", this.value);
            main.iconManager.refresh();
        }
    };
    
    // Bind ticksMenuItem
    ticksMenuItem.checked = main.configurationManager.get("showTicks", false);
    ticksMenuItem.onchange = function () {
        main.configurationManager.set("showTicks", this.checked);
        main.menuManager.appIcon.refresh();
    };
    
    // Bind ticksAutoOpen
    ticksAutoOpen.checked = main.configurationManager.get("ticksAutoOpen", false);
    ticksAutoOpen.onchange = function () {
        main.configurationManager.set("ticksAutoOpen", this.checked);
    };
    
    // Bind ticksLaunch
    ticksLaunch.onclick = function () {
        nativeApplication.dispatchEvent(new air.Event("showTicks"));
    }
    
    // Bind closeButton
    closeButton.onclick = function () { nativeWindow.dispatchEvent(new air.Event("closeWindow")); };
    
    // Show window
	nativeWindow.activate();
}