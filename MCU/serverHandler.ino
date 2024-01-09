

void handleServerData(int gpioStatus, String ledColor, int lightAlarm){
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
