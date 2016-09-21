var tempManager = new function () {
    var theFile = new air.File;
    var timers = {};
    
    this.file = function (name, ttl) {
        deleteFile(name);
        timers[name] = setTimeout(method(null, deleteFile, name), +ttl);
        return theFile;
    };
    
    function deleteFile (name) {
        theFile.url = "app-storage:/temp/" + name;
        if (theFile.exists) theFile.deleteFile();
        if (!name in timers) return;
        clearTimeout(timers[name]);
        delete timers[name];
    }
    
    nativeApplication.addEventListener(air.Event.EXITING, function () {
        Object.keys(timers).forEach(deleteFile);
    });
};
