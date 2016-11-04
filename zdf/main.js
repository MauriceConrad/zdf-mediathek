var http = require("http");
var https = require("https");

var fs = require("fs");


module.exports = {
  getSources: function(url, handle) {
    request(url, function(context) {
      var jsb = getJSB(context);
      var configuration = {};
      request("www.zdf.de" + jsb.config, function(result) {
        configuration = JSON.parse(result);
        var clientHeaders = {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/602.2.14 (KHTML, like Gecko) Version/10.0.1 Safari/602.2.14",
          "Referer": jsb.content,
          "Origin": "www.zdf.de",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Accept": "application/vnd.de.zdf.v1.0+json",
          "X-Requested-With": "XMLHttpRequest",
          "Api-Auth": "Bearer " + configuration.apiToken
        };
        request(jsb.content.replace("https://", ""), function(result) {
          var videoInfo = JSON.parse(result);
          var assetId = videoInfo.tracking.nielsen.content.assetid;
          request("api.zdf.de/tmd/2/ngplayer_2_3/vod/ptmd/mediathek/" + assetId, function(result) {
            result = JSON.parse(result);
            var streamFileUrl = result.priorityList[0].formitaeten[0].qualities[0].audio.tracks[0].uri;
            var streamFileMp4Items = result.priorityList[1].formitaeten[0].qualities;
            var mp4Items = [];
            for (var i = 0; i < streamFileMp4Items.length; i++) {
              streamFileMp4Items[i]
              mp4Items.push({
                "uri": streamFileMp4Items[i].audio.tracks[0].uri,
                "quality": streamFileMp4Items[i].quality
              });
            }
            //console.log(mp4Items);
            request(streamFileUrl.replace("https://", ""), function(result) {
              var streams = [];
              var lines = result.split("\n");
              for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf("#EXT-X-STREAM-INF:") >= 0) {
                  var resolution = "none";
                  var lineInfos = lines[i].split(",");
                  for (var a = 0; a < lineInfos.length; a++) {
                    var prop = lineInfos[a].split("=");
                    if (prop[0] == "RESOLUTION") {
                      resolution = prop[1];
                    }
                  }
                  if (resolution != "none") {
                    streams.push({
                      resolution: resolution,
                      uri: lines[i + 1]
                    });
                  }
                }
              }
              for (var i = 0; i < streams.length; i++) {
                if (streams[i].resolution == "1280x720") {
                  request(streams[i].uri.replace("https://", ""), function(result) {
                    var stream = [];
                    var lines = result.split("\n");
                    for (var a = 0; a < lines.length; a++) {
                      if (lines[a].indexOf("#EXTINF:") >= 0) {
                        stream.push(lines[a + 1]);
                      }
                    }
                    handle({
                      files: mp4Items,
                      stream: stream
                    });
                  });
                }
              }
            });
          }, clientHeaders);
        }, clientHeaders);
      });
    });
  },
  downloadStream: function(url, output, handle) {
    if (output == undefined) {
      output = __dirname + "/output.ts";
    }
    this.getSources(url, function(result) {
      fs.writeFile(output, "", function(err) {
        if (err) {
          return console.error(err);
        }
      });
      var compacts = result.stream.length;
      //compacts = 5;
      var lastTime = new Date().getTime();
      var dataLength = 0;
      var i = 0;
      addStreamFile();
      function addStreamFile() {
        https.get(result.stream[i], function(res) {
          var data = [];
          res.on('data', function(chunk) {
            data.push(chunk);
          }).on('end', function() {
            var buffer = Buffer.concat(data);
            fs.appendFile(output, buffer, function(err) {
              if (err) {
                return console.error(err);
              }
            });
            i++;
            if (i < compacts) {
              addStreamFile();
            }
            dataLength += buffer.length;
            var currTime = new Date().getTime();
            handle({
              parts: i,
              all: compacts,
              length: dataLength,
              total: compacts,
              time: currTime - lastTime
            });
            lastTime = currTime;
          });
        });
      }
    });
  }
}

function request(url, handle, headers) {
  var host = url.substring(0, url.indexOf("/"));
  var path = url.substring(url.indexOf("/"));
  headers = headers == undefined ? {} : headers;
  https.request({
    host: host,
    path: path,
    method: "GET",
    headers: headers
  }, function(response) {
    var result = "";
    response.on("data", function(chunk) {
      result += chunk;
    })
    response.on("end", function() {
      handle(result);
    })
  }).end();
}
function getJSB(context) {
  var startSearchStr = " data-zdfplayer-jsb=";
  var jsbPosStart = context.indexOf(startSearchStr);
  var jsbPosEnd = context.indexOf("'", jsbPosStart + startSearchStr.length + 1);
  var jsbContext = context.substring(jsbPosStart + startSearchStr.length + 1, jsbPosEnd);
  return JSON.parse(jsbContext);
}
