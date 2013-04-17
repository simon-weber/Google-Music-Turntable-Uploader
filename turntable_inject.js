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
    /* TODO
     * don't assume len(library)
     * make cache keyset and display keyset user-configurable
     */
    console.log(library);

    /*var col_names = Object.keys(library[0]);*/
    var col_names = ['title', 'artist', 'album'];

    var song_arrays = library.map(function(song){
        var ar = [];
        for(var i = 0; i < col_names.length; i++){
            ar.push(song[col_names[i]]);
        }
        return ar;
    });

    var dt_columns = col_names.map(function(col_name){
        return { 'sTitle': col_name };
    });

    turntable.showAlert($('<table id="gmusicturntable_library"></table>')[0]);
    $('#overlay').find(':button').text('close');
    $('#overlay').find('.modal').width(600);

    var dt_config = {
        'aaData': song_arrays,
        'aoColumns': dt_columns
    };

    console.log(dt_config);

    $('#overlay').find('#gmusicturntable_library').dataTable(dt_config);
}
