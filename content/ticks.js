var main = window.opener;

window.onload = function () {
    // Initialise window position and size
    var screenWidth = mainScreen.bounds.width;
    var screenHeight = mainScreen.bounds.height;
    
	nativeWindow.stage.stageWidth = Math.min(screenWidth,
        main.configurationManager.get("tickTimings.windowWidth", 450));
	nativeWindow.stage.stageHeight = Math.min(screenHeight,
        main.configurationManager.get("tickTimings.windowHeight", 350));

    nativeWindow.x = Math.max(mainScreen.visibleBounds.left,
        Math.min(mainScreen.visibleBounds.right - nativeWindow.stage.stageWidth,
        main.configurationManager.get("tickTimings.windowLeft",
        mainScreen.bounds.left + ((screenWidth - nativeWindow.stage.stageWidth) / 2))));
        
    nativeWindow.y =  Math.max(mainScreen.visibleBounds.top,
        Math.min(mainScreen.visibleBounds.bottom - nativeWindow.stage.stageHeight,
        main.configurationManager.get("tickTimings.windowTop",
        mainScreen.bounds.top + ((screenHeight - nativeWindow.stage.stageHeight) / 2))));
    
    // Show window
    nativeWindow.activate();
    
    // Initialise loading of ticks page
    document.getElementById("inset").src = main.settings.debug
        ? "http://localhost/CantrTicks/small.php"
        : "http://joo.freehostia.com/cantr/ticks/small.php";
};

nativeWindow.addEventListener("closeWindow", function () {
    main.configurationManager.set("tickTimings.windowLeft", nativeWindow.x, true);
    main.configurationManager.set("tickTimings.windowTop", nativeWindow.y, true);
    main.configurationManager.set("tickTimings.windowWidth", nativeWindow.stage.stageWidth, true)
    main.configurationManager.set("tickTimings.windowHeight", nativeWindow.stage.stageHeight, true)
}, false, 1);