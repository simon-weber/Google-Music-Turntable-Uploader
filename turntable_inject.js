/**
* Creates and returns a blob from a data URL (either base64 encoded or not).
* source: https://github.com/ebidel/filer.js/blob/master/src/filer.js#L128
*
* @param {string} dataURL The data URL to convert.
* @return {Blob} A blob representing the array buffer data.
*/
function gmtt_dataurl_to_blob(dataURL) {
    /* TODO fix duplicate declarations */
    var BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
        var parts = dataURL.split(',');
        var contentType = parts[0].split(':')[1];
        var raw = parts[1];

        return new Blob([raw], {type: contentType});
    }

    var parts = dataURL.split(BASE64_MARKER);
    var contentType = parts[0].split(':')[1];
    var raw = window.atob(parts[1]);
    var rawLength = raw.length;

    var uInt8Array = new Uint8Array(rawLength);

    for (var i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
}
