var theFileStream = new air.FileStream;
function readFile (file) {
    try {
        theFileStream.open(file, air.FileMode.READ);
        return theFileStream.readUTFBytes(theFileStream.bytesAvailable);
    } finally {
        theFileStream.close();
    }
}
function writeFile (file, string) {
    try {
        theFileStream.open(file, air.FileMode.UPDATE);
        theFileStream.writeUTFBytes(string);
    } finally {
        theFileStream.close();
    }
}

function redirect (url) {
    var html = readFile(new air.File("app:/content/redirect.htm"));
    var temp = tempManager.file("redirect.htm", 10000);
    writeFile(temp, html.replace(/%url%/, url));
    air.navigateToURL(new air.URLRequest(temp.url));
}
