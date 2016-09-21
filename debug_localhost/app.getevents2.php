<?php

$userid = $_REQUEST['id'];
$pass = $_REQUEST['pass'];
$ver = $_REQUEST['ver'];
$requestkey = $_REQUEST['requestkey'];

if (strlen ($userid) < 1 || strlen ($userid) > 6)
    die ("ERROR Hacking attempt");
if (!is_numeric ($userid))
    die ("ERROR Hacking attempt");
if (substr ($ver, 0, 6) != "1.1.0.")
    die ("ERROR Wrong version");

if ($requestkey == "1") {
    echo "10001\n";
    echo "96029d9b2c3e150a582af0012b7f0a95\n";
    echo "19";
} else {
    require_once "jcrypt/jCryption-1.0.1.php";
    $jCryption = new jCryption;

    $decrpass = $jCryption->decrypt(
        $pass,
        "32144247554415158744256763037986114013",
        "199397780593819806807529031897016371861"
    );
    if (($userid == "83913") && ($decrpass == "cantrtest")) {
        echo "OK LIST\n" .
             "Ecaftnuc\n" .
             "Quarantine";
    }
    else {
        echo "BAD LOGIN";
    }
}

?>