#pragma once

// Save this file as secrets.local.h before flashing. Do not commit that file.
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// LAN address of the Docker host running Mosquitto, for example 192.168.1.20.
#define MQTT_HOST "192.168.1.20"
#define MQTT_PORT 1883

// Leave blank for the local Docker demo broker.
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""

// Calibrate only after verifying the LM393 AO voltage is <= 3.3 V.
// Typical modules invert these values, so do not copy example numbers blindly.
#define SOIL_SENSOR_USE_ANALOG 1
#define SOIL_DRY_RAW -1
#define SOIL_WET_RAW -1

// Set to 1 only for LEDs/modules with verified current limiting.
#define ENABLE_LED_OUTPUT 0
