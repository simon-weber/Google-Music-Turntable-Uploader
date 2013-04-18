var library_node = null; // cached library dom node created on first display
var inject_files = [
    'DataTables-1.9.4/media/js/jquery.dataTables.js',
    'turntable_inject.js'
    ];

/*
 * Inject some javascript (as a string) into the DOM.
 */
function inject_code(code){
   var script = document.createElement('script');
   script.textContent = code;
   (document.head||document.documentElement).appendChild(script);
   script.parentNode.removeChild(script);
}

/*
 * Retrieve a file from Google, then trick Turntable into uploading it.
 */
function upload_track(id){
    console.log('upload_track', id);

    chrome.extension.sendMessage({action: 'get_track_dataurl', id: id}, function(response) {
        var dataurl = response.dataurl;

        var code = '(' + function(inject_dataurl) {
            var blob = gmusicturntable_dataurl_to_blob(inject_dataurl);

            /* spoof the File interface */
            blob.name = 'myfile.mp3';
            blob.lastModifiedDate = new Date();

            document.querySelector('input[type=file]').onchange.call({files:[blob]});

        } + ')(' + JSON.stringify(dataurl) + ')';

       inject_code(code);
    });
}

/*
 * Present the library to the user so they can choose songs to upload.
 */
function show_library(){
    chrome.extension.sendMessage({action: 'get_library'}, function(response) {
        var library = response.library;

        if(library_node === null){
            console.log('caching');
            cache_library_node(library, _show_library);
        }
        else{
            console.log('not caching');
            _show_library();
        }
    });
}

/*
 * Shows the library, assuming that the library_node is created and cached.
 */
function _show_library(){
    // insert into the dom in a random location, keeping it hidden.
    // we just need to be able to move it later from injected code.
    
    console.log('_show', library_node);
    library_node.hide();
    // need to insert the parent; dataTable creates a wrapper
    library_node.parent().insertAfter($('#gmusicturntable_upload_button'));

    var code = '(' + function() {
        turntable.showAlert($('#gmusicturntable_library').parent()[0]);
        $('#gmusicturntable_library').show();

        /* change their default modal styling */
        $('#overlay').find(':button.submit').text('close');
        $('#overlay').find('.modal').width(600);
    } + ')()';

    inject_code(code);

    // when the modal is closed, turntable.hideAlert() is called.
    // this destroys the library node; we need to keep a reference to it here.
}

/*
 * The library dom node is expensive to create.
 * This is called each time the library is refreshed.
 *
 * `callback` should take no arguments and reference the global library_node.
 */
function cache_library_node(library, callback){
    /* TODO
     * make cache keyset and display keyset user-configurable
     */
    console.log('caching library_node', library);

    /* setup the user-defined columns */
    var user_col_names = ['title', 'artist', 'album'];

    var song_arrays = library.map(function(song){
        var ar = [];
        ar.push(song.id); /* always have the id as first column */

        for(var i = 0; i < user_col_names.length; i++){
            ar.push(song[user_col_names[i]]);
        }
        return ar;
    });

    var dt_columns = user_col_names.map(function(col_name){
        return {
            'sTitle': col_name[0].toUpperCase() + col_name.slice(1)
        };
    });

    /* prepend the id column config.
     * each id row renders as a button that stores its id in `data-id`.
     */

    dt_columns.unshift({
        'sTitle': 'Id',
        'mRender': function(data, type, full){
            return '<button' +
                ' class="gmusicturntable"' +
                ' data-id="' + data + '"' + 
                '>upload</button>';
        }
    });


    library_node = $('<table></table>');
    library_node.attr('id', 'gmusicturntable_library');

    var dt_config = {
        'aaData': song_arrays,
        'aoColumns': dt_columns
    };

    // dataTable expects parent elements
    library_node.wrap('<div />');
    // expensive and synchronous call
    library_node.dataTable(dt_config);

    library_node.on('click', ':button.gmusicturntable', function(event){
        upload_track(event.target.getAttribute('data-id'));
        return false; // stop propogation
    });

    if(typeof callback !== "undefined"){
        callback();
    }
}

function main(){
    chrome.extension.sendMessage({action: 'show_page_action'});

    // inject our files to use them as libraries later
    for(var i = 0; i < inject_files.length; i++){
        var s = document.createElement('script');
        console.log('injecting', chrome.extension.getURL(inject_files[i]));
        s.src = chrome.extension.getURL(inject_files[i]);
        //TODO don't make functions in a loop
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);
    }

    // create/inject our button
    // TODO replicate mouseover style
    var tt_button = $('#plupload');

    var gm_button = tt_button.clone();
    gm_button.attr('id', 'gmusicturntable_upload_button');
    gm_button.text('Upload from Google Music');
    gm_button.attr('style', window.getComputedStyle(tt_button[0], null).cssText);
    
    gm_button.click(function() {
        show_library();
    });

    gm_button.insertAfter(tt_button);
}

(function() {
    // turntable fires ready early, so we poll for the upload button
    if ($('#plupload').length > 0){
        main();
    } else {
        //TODO backoff
        setTimeout(arguments.callee,1000);
    }
})();
