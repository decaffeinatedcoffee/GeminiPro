 void changeDeviceState(){
        DynamicJsonDocument doc(128);
        JsonArray array = doc.to<JsonArray>();
        array.add("changedevicestate");
        JsonObject param1 = array.createNestedObject();
        param1["id"] = deviceID;
        String output;
        serializeJson(doc, output);
        socketIO.sendEVENT(output);
        Serial.println("[SYSTEM] Sent trigger to API via WebSocket");
 }
  
  void changeDeviceStateLocally(){
   Serial.println("[SYSTEM] Changed device state locally due fail to connect to WebSocket");
   if(digitalRead(switchGpio) == HIGH){
    digitalWrite(switchGpio, LOW);
    leds[0] = CRGB::Black;
    FastLED.show();
    leds[0] = CRGB::Red;
     FastLED.show();
    delay(1000);
   }else{
    digitalWrite(switchGpio, HIGH);
    leds[0] = CRGB::Black;
    FastLED.show();
    leds[0] = CRGB::Green;
    FastLED.show();
    delay(1000);
   }
  }


  unsigned long lastpressed = 0;
 void physicalSwitchStatus(){
  if(digitalRead(D1) == HIGH && pressed == false){
    if(socketIO.isConnected()){
    changeDeviceState();
    }else{
      changeDeviceStateLocally();
    }
    pressed = true;
    lastpressed = millis();
  }
  if(pressed == true){
    if(millis() - lastpressed >= 1500){
    pressed = false;
    }
  }
 }
