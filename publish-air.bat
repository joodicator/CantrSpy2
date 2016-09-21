@echo off
call ..\AIR_SDK\bin\adt -package -storetype pkcs12 -keystore ..\Certificate\AIR-JosephCrowe-2014.pfx published\package.air application.xml content modules locale icons changes.log || pause
