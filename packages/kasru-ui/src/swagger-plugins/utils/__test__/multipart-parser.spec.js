const Buffer = require("buffer/").Buffer;
const ee = require("event-emitter");
const Stream = require('readable-stream');
const { MultipartParser } = require("../multipart-parser");

const demo = require('./form-data.example');

test("parser work", done => {
  const parser = new parseIt("===============3285061002692002213==")
  parser.onEnd = () => {
    console.info(parser);
    done();
  };
  parser.write(Buffer.from(demo, "utf8"));
});

function parseIt(boundary) {
  var parser = new MultipartParser(),
    headerField,
    headerValue,
    part;
  var self = {
    ended: false,
    encoding: "utf8",
    _fileName(name) {
      return name;
    },
    _error(err) {
      console.error(err);
    },
    onPart(part) {
      let partData = null;
      part.on('data', (buffer) => {
        partData = partData === null ? buffer : Buffer.concat([partData, buffer]);
      })
      part.on('end', () => {
        console.info(part.name || part.filename, 'data', partData.toString('utf8'));
      })
    }
  };

  parser.initWithBoundary(boundary);

  parser.onPartBegin = function() {
    part = new Stream();
    ee(part);
    part.readable = true;
    part.headers = {};
    part.name = null;
    part.filename = null;
    part.mime = null;

    part.transferEncoding = "binary";
    part.transferBuffer = "";

    headerField = "";
    headerValue = "";
  };

  parser.onHeaderField = function(b, start, end) {
    headerField += b.toString(self.encoding, start, end);
  };

  parser.onHeaderValue = function(b, start, end) {
    headerValue += b.toString(self.encoding, start, end);
  };

  parser.onHeaderEnd = function() {
    headerField = headerField.toLowerCase();
    part.headers[headerField] = headerValue;

    // matches either a quoted-string or a token (RFC 2616 section 19.5.1)
    var m = headerValue.match(
      /\bname=("([^"]*)"|([^\(\)<>@,;:\\"\/\[\]\?=\{\}\s\t/]+))/i
    );
    if (headerField == "content-disposition") {
      if (m) {
        part.name = m[2] || m[3] || "";
      }

      part.filename = self._fileName(headerValue);
    } else if (headerField == "content-type") {
      part.mime = headerValue;
    } else if (headerField == "content-transfer-encoding") {
      part.transferEncoding = headerValue.toLowerCase();
    }

    headerField = "";
    headerValue = "";
  };

  parser.onHeadersEnd = function() {
    switch (part.transferEncoding) {
      case "binary":
      case "7bit":
      case "8bit":
        parser.onPartData = function(b, start, end) {
          part.emit("data", b.slice(start, end));
        };

        parser.onPartEnd = function() {
          part.emit("end");
        };
        break;

      case "base64":
        parser.onPartData = function(b, start, end) {
          part.transferBuffer += b.slice(start, end).toString("ascii");

          /*
        four bytes (chars) in base64 converts to three bytes in binary
        encoding. So we should always work with a number of bytes that
        can be divided by 4, it will result in a number of buytes that
        can be divided vy 3.
        */
          var offset = parseInt(part.transferBuffer.length / 4, 10) * 4;
          part.emit(
            "data",
            new Buffer(part.transferBuffer.substring(0, offset), "base64")
          );
          part.transferBuffer = part.transferBuffer.substring(offset);
        };

        parser.onPartEnd = function() {
          part.emit("data", new Buffer(part.transferBuffer, "base64"));
          part.emit("end");
        };
        break;

      default:
        return self._error(new Error("unknown transfer-encoding"));
    }

    self.onPart(part);
  };

  parser.onEnd = function() {
    self.ended = true;
    self._maybeEnd();
  };

  return parser;
}

function processPart(part) {
  var self = this;

  // This MUST check exactly for undefined. You can not change it to !part.filename.
  if (part.filename === undefined) {
    var value = ''
      , decoder = new StringDecoder(this.encoding);

    part.on('data', function(buffer) {
      self._fieldsSize += buffer.length;
      if (self._fieldsSize > self.maxFieldsSize) {
        self._error(new Error('maxFieldsSize exceeded, received '+self._fieldsSize+' bytes of field data'));
        return;
      }
      value += decoder.write(buffer);
    });

    part.on('end', function() {
      self.emit('field', part.name, value);
    });
    return;
  }

  this._flushing++;

  var file = new File({
    path: this._uploadPath(part.filename),
    name: part.filename,
    type: part.mime,
    hash: self.hash
  });

  this.emit('fileBegin', part.name, file);

  file.open();
  this.openedFiles.push(file);

  part.on('data', function(buffer) {
    self._fileSize += buffer.length;
    if (self._fileSize > self.maxFileSize) {
      self._error(new Error('maxFileSize exceeded, received '+self._fileSize+' bytes of file data'));
      return;
    }
    if (buffer.length == 0) {
      return;
    }
    self.pause();
    file.write(buffer, function() {
      self.resume();
    });
  });

  part.on('end', function() {
    file.end(function() {
      self._flushing--;
      self.emit('file', part.name, file);
      self._maybeEnd();
    });
  });
}
