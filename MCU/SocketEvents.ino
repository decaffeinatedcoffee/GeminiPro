void checkRegister(){
if(socketIO.isConnected() && registered == false){
DynamicJsonDocument doc(128);
        JsonArray array = doc.to<JsonArray>();
        array.add("register");
        JsonObject param1 = array.createNestedObject();
        param1["id"] = deviceID;
        String output;
        serializeJson(doc, output);
        socketIO.sendEVENT(output);
        Serial.println(output);
 Serial.println("[NETWORK] Registered to Socket");
 registered = true;
}
}

void postServer(){
  DynamicJsonDocument doc(128);
        JsonArray array = doc.to<JsonArray>();
        array.add("motion");
        JsonObject param1 = array.createNestedObject();
        param1["id"] = deviceID;
        String output;
        serializeJson(doc, output);
        socketIO.sendEVENT(output);
}



void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
	switch(type) {
		case sIOtype_DISCONNECT:
			Serial.printf("[NETWORK] WebSocket Disconnected!\n");
      registered = false;
			break;
		 case sIOtype_CONNECT:
			Serial.printf("[NETWORK] Connected to socket on: %s\n", payload);
      socketIO.send(sIOtype_CONNECT, "/"); 
      
      break;
       case sIOtype_EVENT:
  DynamicJsonDocument jsonDocument(128);
DeserializationError error = deserializeJson(jsonDocument, payload, length);
if (error) {
    Serial.println("[ERROR] Error parsing API");
  }
   else {
   JsonArray root = jsonDocument.as<JsonArray>();
     int gpio = root[1]["gpioStatus"];
     int lightAlarm = root[1]["lightAlarm"];
     bool err = root[1]["error"];
     String led = root[1]["ledColor"];
     if(err == false){
   handleServerData(gpio, led, lightAlarm);
   }
}
        break;
		}
		
  }