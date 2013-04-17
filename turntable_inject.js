/* this code needs to be injected into the page in order to interact with
 * the global `turntable` object. */


/**
* Creates and returns a blob from a data URL (either base64 encoded or not).
* source: https://github.com/ebidel/filer.js/blob/master/src/filer.js#L128
*
* @param {string} dataURL The data URL to convert.
* @return {Blob} A blob representing the array buffer data.
*/
function gmusicturntable_dataurl_to_blob(dataURL) {
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

function gmusicturntable_show_library(library) {
    console.log('inject show got:', library);

    var library_tbl = $('<table></table>').attr({id: 'gmusic-library'});

    /* TODO
     * datatables
     * caching
     * */
    for (var i = 0; i < library.length; i++) {
        var row = $('<tr></tr>').appendTo(library_tbl);
        $('<td></td>').text(library[i]['title']).appendTo(row);
    }

    turntable.showAlert(library_tbl[0]);
    $('#overlay').find(':button').text('close');
}
