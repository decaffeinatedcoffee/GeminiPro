 void changeDeviceState(){
  if (WiFi.status() == WL_CONNECTED) { 
  client.setInsecure(); 
  http.begin(client, "https://geminipro.cyclic.app/api/v1/device/changestate?id="+deviceID);  
  int httpCode = http.GET();   
  Serial.println("[SYSTEM] Sent trigger to API.");                              
  http.end();  
  }
 }

 void physicalSwitchStatus(){
  if(digitalRead(D7) == HIGH && pressed == false){
    changeDeviceState();
    pressed = true;
  }

  switchsideAstatus = digitalRead(D5);
  switchsideBstatus = digitalRead(D6);

  if(switchsideAstatus != lastswitchsideAstatus && switchsideBstatus != lastswitchsideBstatus){
    lastswitchsideAstatus = switchsideAstatus;
    lastswitchsideBstatus = switchsideBstatus;
    changeDeviceState();
  }
 }
