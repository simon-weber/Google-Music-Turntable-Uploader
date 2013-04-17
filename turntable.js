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
    chrome.extension.sendMessage({action: 'get_track_dataurl', id: id}, function(response) {
        var dataurl = response.dataurl;

        var code = '(' + function(inject_dataurl) {
            var blob = gmusicturntable_dataurl_to_blob(inject_dataurl);

            /* spoof the File interface */
            blob.name = 'myfile.mp3';
            blob.lastModifiedDate = new Date();

            document.querySelector('input[type=file]').onchange.call({files:[blob]})

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

        var code = '(' + function(inject_library) {
            gmusicturntable_show_library(inject_library);
        } + ')(' + JSON.stringify(library) + ')';

       inject_code(code);
    });
}

function main(){
    chrome.extension.sendMessage({action: 'show_page_action'});

    // inject our files to use them as libraries later
    for(var i = 0; i < inject_files.length; i++){
        var s = document.createElement('script');
        console.log('injecting', chrome.extension.getURL(inject_files[i]));
        s.src = chrome.extension.getURL(inject_files[i]);
        s.onload = function() {
            this.parentNode.removeChild(this);
        };
        (document.head||document.documentElement).appendChild(s);
    }

    // create/inject our button
    // TODO replicate mouseover style
    var tt_button = $('#plupload');

    var gm_button = tt_button.clone();
    gm_button.attr('id', 'gmupload');
    gm_button.text('Upload from Google Music');
    gm_button.attr('style', window.getComputedStyle(tt_button[0], null).cssText);
    gm_button.insertAfter(tt_button);

    gm_button.click(function() {
        show_library();
    });
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
