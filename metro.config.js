// Datei: metro.config.js
// Standard-Konfiguration von Expo plus eine Regel für three.js:
//
// React Three Fiber lädt `three` per require() (→ build/three.cjs), unser
// Code per import (→ build/three.module.js). Ohne diese Regel landen ZWEI
// three-Kopien im Bundle („Multiple instances of Three.js being imported“):
// doppelter Speicher, und z. B. ein Vector3 aus unserem Code wird von R3F
// nicht erkannt („Cannot assign to read-only property 'position'“).
// Darum zeigt jeder Import von `three` auf dieselbe Datei.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const THREE_ENTRY = path.resolve(__dirname, "node_modules/three/build/three.cjs");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "three") {
    return { type: "sourceFile", filePath: THREE_ENTRY };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
