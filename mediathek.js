var zdf = require(__dirname + "/zdf");
var http = require("http");
var https = require("https");
var fs = require("fs");

var percent = 0;
var lastPercent = 0;

var args = {};
for (var i = 2; i < process.argv.length; i++) {
  if (process.argv[i].indexOf("=") >= 0) {
    args[process.argv[i].split("=")[0]] = process.argv[i].split("=")[1];
  }
}

if (args.src == undefined) {
  return console.error("No source defined.");
}

var url = args.src.replace("https://", "");
if (args.out == undefined) {
  args.out = url.split("/")[url.split("/").length - 1].split(".")[0];
}

if (args.quality == "low" || args.quality == "high" || args.quality == "veryhigh") {
  zdf.getSources(url, function(res) {
    for (var i = 0; i < res.files.length; i++) {
      if (res.files[i].quality == args.quality) {
        https.get(res.files[i].uri, function(response) {
          var data = [];
          var dataLength = 0;
          var lastPercent = 0;
          response.on("data", function(chunk) {
            data.push(chunk);
            dataLength += chunk.length;
            var percent = Math.round((dataLength / response.headers["content-length"]) * 100);
            if (percent - lastPercent >= 1) {
              process.stdout.clearLine();
              process.stdout.cursorTo(0);
              process.stdout.write(percent + "%");
              lastPercent = percent;
            }
          })
          response.on("end", function() {
            var buffer = Buffer.concat(data);
            var fileName = args.out + (args.out.search(".mp4") >= 0 ? "" : ".mp4");
            fs.writeFile(fileName, buffer, function(err) {
              if (err) {
                return console.error(err);
              }
              console.log("\nWrote File '" + fileName + "'");
            });
          })
        });
      }
    }
  });
}
else if (args.quality == "hd") {
  var fileName = args.out + (args.out.search(".ts") >= 0 ? "" : ".ts");
  zdf.downloadStream(url, fileName, function(progress) {
    process.stdout.clearLine();  // clear current text
    process.stdout.cursorTo(0);
    process.stdout.write(progress.parts + " / " + progress.all);
    if (progress.parts >= progress.all) {
      console.log("Wrote File at '" + fileName + "'");
    }
  });
}
else {
  console.error("Quality is invalid.");
}

function formatPercentage(length, total) {
  return Math.round((length / total) * 100 * 10) / 10;
}


function formatBytes(bytes){
  var kb = 1000;
  var ndx = Math.floor( Math.log(bytes) / Math.log(kb) );
  var fileSizeTypes = ["bytes", "kb", "mb", "gb", "tb", "pb", "eb", "zb", "yb"];

  return {
    size: +(bytes / kb / kb).toFixed(2),
    type: fileSizeTypes[ndx]
  };
}
