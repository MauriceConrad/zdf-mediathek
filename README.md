# ZDF Mediathek

## Install

```bash
npm install zdf
```

Dieses Node.js Module bietet Methoden um die API der ZDF Mediathek zu nutzen um lediglich Informatioen über die Source Files zu erlangen sowie eine direkte Download-Möglichkeit für die HD Version, da diese sich aus mehreren .ts Dateien zusammensetzt.

## Wie funktioniert die Meditahek?

Zuerst einmal muss klar sein, wie der moderne Player der ZDF Mediathek überhaupt funktioniert. Die Videos werden im Grunde über die HTML5 Schnittstelle eingebunden, sind aber keine .mp4 Datein mehr, wie in der alten Version der Mediathek, sondern bestehen aus mehreren .m3u(8) Playlist Files, welche dann auf .ts Dateien verweisen.

Die erste Playlist Datei ist dirket in der "src" des Video-Tags eingebunden. In dieser werden fünf weitere .m3u(8) Dateien verlinkt, die der Browser nach der dazu passenden Auflösung bzw. der Brandbreite auswählt. In jeder dieser .m3u(8) Files wiederum befindet sich eine "echte" Playlist mit .ts Video Dateien. Diese sind jeweils 10 Sekunden lang.

Wer also die "src" URL aufruft und mit einem Rechtsklick einen Downlaod versucht, bekommt statt dem Vidoe lediglich eine .m3u(8) (Text-)Datei.

Rein theoretisch existiert in der Datenbank aber noch ein Fallback auf .mp4 Dateien, welche aber nur in geringer Qualität vorhanden sind.

### Warum der Aufwand?

Der Grund warum, nicht wie bei der alten Version, keine einfachen .mp4 Dateien eingebunden werden ist, dass sich durch die "neue" Technik die Möglichkeit eröffnet, während das Video läuft, die Qualität zu ändern, sei es aufgrund einem kleineren Video Element, oder fehlender Brandbreite. Durch die Aufteilung in 10 Sekunden "Schnipsel", kann der Player jederzeit ohne großen Aufwand jeden beliebigen Teil des Videos in einer anderen Qualität laden.


## Documentation

### Require

```javascript
var zdf = require("zdf");

console.log(zdf)
```

### Methoden
#### getSources
```javascript
var url = "www.zdf.de/comedy/neo-magazin-mit-jan-boehmermann/neo-magazin-royale-mit-jan-boehmermann-clip-4-100.html";

zdf.getSources(url, function(response) {

  console.log(response)

  /*Example Response

  {
    files: [
      {
        uri: "xxx.mp4",
        quality: "veryhigh"
      },
      {
        uri: "xxx.mp4",
        quality: "high"
      },
      {
        uri: "xxx.mp4",
        quality: "low"
      }
    ],
    stream: [
      "xxx.ts",
      "xxx.ts",
      "xxx.ts",
      [..., ..., ...[,...]]
    ]
  }

  */

})
```
Die "Response" hier ist ein Object welches das Array "files" enthält, was wiederum die .mp4 "Fallbacks" enthält. Dabei handelt es sich um die Qualitäten "low", "high", "veryhigh". HD ist dabei nicht verfügbar, sondern stattdessen einzig über den ".ts-Stream"

Das zweite Array ist das Array "stream". Dieses enthält eine Liste aller .ts (10 Sekunden) Schnippsel in der Qualität "HD" oder auch 1280x720. So liefert die Methode nur die .ts Streaming Liste für die HD Qualität aus, da die anderen niederen Qualitäten von den .mp4 Fallbacks abgedeckt werden.

#### downloadStream

Da eine Liste mit .ts Files allein wenig nützt, außer man hat Lust diese alle händisch zu downloaden und anschlißend zusammenzuschneiden, macht die Methode "downloadStream()" genau das. So wird neben einer URL, einer Callback Function auch ein Output-Path als Argument mitgegegeben.

Die Callback Function wird nicht gefeuert, wenn die Datei fertig ist, sondern wenn ein Schnippsel erfolgreich gedownloadet wurde. Dementsprechend enthält es im Object "progress" die aktuelle Anzahl von "parts" (progress.parts) und die Gesamtanzahl solcher (progress.all)

```javascript
var url = "www.zdf.de/comedy/neo-magazin-mit-jan-boehmermann/neo-magazin-royale-mit-jan-boehmermann-clip-4-100.html";
var outputFile = "/Downloads/Video.ts";
zdf.downloadStream(url, outputFile, function(progress) {

  console.log(progress)

})
```
