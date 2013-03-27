function upload_track(id){
    chrome.extension.sendMessage({action: 'get_track_file', id: id}, function(response) {
        var file = response.file;

        // var code = '(trigger_turntable_googlemusic_upload(' + JSON.stringify(
        // actualCodevar run_function = '(' + function(greeting, name) { ...
        // } + ')(' + JSON.stringify(GREETING) + ',' + JSON.stringify(NAME) + ')';


        console.log(file);

    });
}

function show_library(){
    chrome.extension.sendMessage({action: 'get_library'}, function(response) {
        var library = response.library;

        console.log(library); //TODO
    });
}

function main(){
    chrome.extension.sendMessage({action: 'show_page_action'});

    // inject our upload function
    // var s = document.createElement('script');
    // s.src = chrome.extension.getURL("turntable_inject_once.js");
    // s.onload = function() {
    //     this.parentNode.removeChild(this);
    // };
    // (document.head||document.documentElement).appendChild(s);

    // create our button
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


// trigger drop: http://stackoverflow.com/a/3647016/1231454
/*
 * $("#droppable").droppable({
 *         drop: function(event, ui) {
 *             do stuff }
 *     });
 * var drop_function = $("#droppable").droppable.option('drop');
 * drop_function();
 */
