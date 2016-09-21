<?php
$option = key($_GET);
$air_path = 'http://joo.uk.to/cantr/cantrspy/air/';
$version = '2.9.0';
$air = $air_path . 'cantrspy_2_9_0.air';

if ($option == 'update' && $_GET['key'] != '2014') {
    // Updating from an incompatible version; offer nothing.
} else if ($option == 'update' && $_GET['key'] == '2014') {
    // Updating from a compatible version.
    $package = 'http://'.$_SERVER['HTTP_HOST'].str_replace('?update', '?package', $_SERVER['REQUEST_URI']);
    $notes = file_get_contents('changes.log');
    echo <<<•
<?xml version="1.0" encoding="utf-8"?>
<update xmlns="http://ns.adobe.com/air/framework/update/description/1.0">
<version>$version</version><url>$package</url><description><![CDATA[$notes]]></description>
</update>
•;
    file_put_contents('update.log',
    $_SERVER['REQUEST_TIME'].' '.
    $_SERVER['REMOTE_ADDR' ].' '.
    $_SERVER['REQUEST_URI' ]."\n",
    FILE_APPEND);
}
else if ($option === 'package') {
    header('Location: ' . $air);
    
    file_put_contents('package.log',
    $_SERVER['REQUEST_TIME'].' '.
    $_SERVER['REMOTE_ADDR' ].' '.
    $_SERVER['REQUEST_URI' ]."\n",
    FILE_APPEND);
}
else {
    if ($option === null) $option = "latest";
    if ($option != "latest") {
        if (preg_match('/^\d+([_\.]\d+)*$/', $option) == 0) die('Invalid version string.');
        $m = preg_split('/[_\.]/', $option);
        $air = $air_path . 'cantrspy_' . implode('_', $m) . '.air';
        $version = implode('.', $m);
    }
    $static = <<<•
<a href="$air">
    <img src="assets/icon.png" width="192" height="192" border="0" title="" />
    <div style="font-size: 16pt; padding: 10px;">Download Installer</div>
</a>
<p style="font-size: 10pt">Requires <a class="link" href="http://get.adobe.com/air">Adobe AIR</a></p>
•;
echo <<<•
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html><head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
    <link rel="icon" href="icon.ico" />
    <title>CantrSpy Installation Page</title>
    <script language="JavaScript" type="text/javascript"><!--
        var requiredMajorVersion = 9, requiredMinorVersion = 0, requiredRevision = 115;
    // --></script>
    <style type="text/css"><!--
        .centred { position: fixed; display: table; width: 100%; height: 100% }
        .centred > * { display: table-cell; text-align: center; vertical-align: middle }
        body { font-family: Verdana, Arial, sans-serif; background-color: #004000; color: #FFF; }
        :link, :visited { text-decoration: none; color: #FFF; }
        .link { text-decoration: underline; font-weight: bold; }
    --></style>
</head><body>
    <span class="centred"><span>
        <div class="title" style="font-size: 24pt; font-weight: bold; padding-bottom: 20px">
            CantrSpy $version
        </div>
•;
    if (array_key_exists("static", $_GET)) {
        echo $static;
    } else {
echo <<<•
        <noscript id="noscript">$static</noscript>
        <script src="assets/AC_RunActiveContent.js" type="text/javascript"></script>
        <script language="JavaScript" type="text/javascript">
        <!--
        if (DetectFlashVer(requiredMajorVersion, requiredMinorVersion, requiredRevision)) {
            AC_FL_RunContent('codebase', 'http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab',
            'width','217', 'height','180', 'id','badge', 'align','middle', 'src','assets/badge',
            'quality','high', 'bgcolor','#004000', 'name','badge', 'allowscriptaccess','always',
            'pluginspage','http://www.macromedia.com/go/getflashplayer',
            'flashvars','appname=CantrSpy&appurl=$air&airversion=2.5&imageurl=assets/badge.png&buttoncolor=000000&messagecolor=FFFFFF',
            'movie','assets/badge');
        } else {
            document.write(document.getElementById("noscript").innerHTML);
        } // -->
        </script>
        <div style="font-size:smaller">
            Submit comments <a class="link" href="http://forum.cantr.org/viewtopic.php?f=1&t=17225">on the forum</a>.
        </div>
        <div style="font-size:smaller">
            <a class="link" href="?$option&static">Manual installation</a>
        </div>
•;
    }
echo <<<•
    </span></span>
</body></html>
•;
}
?>
