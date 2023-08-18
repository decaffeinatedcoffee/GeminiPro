void handleset() {
  String myssid = server.arg("ssid");
  String mypass = server.arg("pass");
  String mytoken = server.arg("deviceid");
   Serial.println("[SERVER] Received post with data");
   if(myssid != ""){
  for (int i = 0; i < 80; ++i)
  {EEPROM.write(i, 0);
  }for (int i = 0; i < myssid.length(); ++i )
  {EEPROM.write(0 + i, myssid[i]);
  }for (int i = 0; i < mypass.length(); ++i)
  {EEPROM.write(30 + i, mypass[i]);
  }EEPROM.commit();
  }if(mytoken != ""){
  for (int i = 81; i < 128; ++i)
  {EEPROM.write(i, 0);
  }for (int i = 0; i < mytoken.length(); ++i)
  {EEPROM.write(81 + i, mytoken[i]);
  }EEPROM.commit();
  }
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", "{\"error\":false}");
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  Serial.println("[SERVER] Received status get");
  server.send(200, "application/json", "{\"status\": \"available\"}");
}


void reboot(){
  ESP.restart();
}


void handlewifi(){
String newssid = server.arg("ssid");
 String newpass = server.arg("pass");
 Serial.println("[SERVER] Received post with data");
 if(newssid != ""){
  for (int i = 0; i < 80; ++i)
  {EEPROM.write(i, 0);
  }for (int i = 0; i < newssid.length(); ++i )
  {EEPROM.write(0 + i, newssid[i]);
  }for (int i = 0; i < newpass.length(); ++i)
  {EEPROM.write(30 + i, newpass[i]);
  }EEPROM.commit();
  }
 server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(200, "application/json", "{\"error\":false}");
}
