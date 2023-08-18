
void handleServerData(int gpioStatus, String ledColor, int lightAlarm, bool err){
  if(lightAlarm == 0 && lastPir == 1){
    lastPir = 0;
  }
   if(lastGstate != gpioStatus){
    pressed = false;
  lastGstate = gpioStatus;
  leds[0] = CRGB::Black;
  FastLED.show();
  digitalWrite(switchGpio, gpioStatus);
  if(gpioStatus == 0){
    lastPir = 0;
  }
  long color = strtol(ledColor.c_str(), NULL, 16);
  lastColor = ledColor;
  leds[0] = color;
  FastLED.show();
 }
 if(lastColor != ledColor){
  long color = strtol(ledColor.c_str(), NULL, 16);
  lastColor = ledColor;
  leds[0] = color;
  FastLED.show();
 }
}

void postServer(){
  if (WiFi.status() == WL_CONNECTED) { 
    client.setInsecure(); 
    http.begin(client, "https://geminipro.cyclic.app/api/v1/device/motion?deviceid="+String(deviceID));      
    http.addHeader("Content-Type", "text/plain"); 
    int httpCode = http.POST("done");           
    http.end();
  }
}

 void fetch(){
  if (WiFi.status() == WL_CONNECTED) { 
   client.setInsecure();  
  http.begin(client, "https://geminipro.cyclic.app/api/v1/device?id="+deviceID);  
  int httpCode = http.GET();                                 
  if (httpCode > 0) { 
  const size_t bufferSize = JSON_OBJECT_SIZE(1) + 128;
  DynamicJsonDocument jsonDocument(bufferSize);
  DeserializationError error = deserializeJson(jsonDocument, http.getString());
  if (error) {
    Serial.println("[ERROR] Error parsing API");
  }
  else {
    JsonObject root = jsonDocument.as<JsonObject>();
     int gpio = root["gpioStatus"];
     int lightAlarm = root["lightAlarm"];
     bool err = root["error"];
     String led = root["ledColor"];
     handleServerData(gpio, led, lightAlarm, err);
  }
    }
    http.end();  
  }
 }

 void fetchtokens(){
  if (WiFi.status() == WL_CONNECTED) { 
  client.setInsecure(); 
  http.begin(client, "https://geminipro.cyclic.app/api/v1/device/sinric/boot/getinfo?id="+deviceID);  
    int httpCode = http.GET();                               
  if (httpCode > 0) { 
  const size_t bsize = JSON_OBJECT_SIZE(1) + 256;
  DynamicJsonDocument sinricdata(bsize);
  DeserializationError error = deserializeJson(sinricdata, http.getString());
  if (error) {
    Serial.println("[ERROR] Error parsing API sinric data");
  }
  else {
    JsonObject tokens = sinricdata.as<JsonObject>();
     bool err = tokens["error"];
     if(err == false){
       String sinricKey = tokens["sinricKey"];
      String sinricSecret = tokens["sinricSecret"]; 
     String sinricID = tokens["sinricID"];
     SinricProSwitch& mySwitch = SinricPro[sinricID];   
     mySwitch.onPowerState(onPowerState);                
     SinricPro.begin(sinricKey, sinricSecret);  
      Serial.println("[SERVER] Got tokens from API");
     }else{
      Serial.println("[SERVER] Got no tokens from API");
     }
  }
    }
    http.end();  
  }
 }
