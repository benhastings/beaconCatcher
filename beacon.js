/*=================================================
//  "Beacon" portion of beaconCatcher project
//
//   For the beacon to be of greatest utility, the pages evaluated should have a 
//     javascript object of the form:
//
//     BPM:{
//        cpc:<product designation>,
//        pagetype:<page category naming>,
//        sessId:<unique session ID>,
//        tranId:<unique per session transaction ID>
//     }
//
//    Update endPoint variable with your beaconCatcher.js Public URL
//
//    If you want to use the custom timing interface for timing the presence of various page elements, 
//       add this in the head of your document
//
//    <script>var prs={rt:function(label,ts){this[label]=(ts||ts==0?ts:new Date().getTime());}}</script>
//
//===============================================*/

var beacon = {
    // Define endpoint for directing beacon output 
    endPoint='http://<YOUR_ELB_NAME>.<ELB_REGION>.elb.amazonaws.com';
    /*-----------------------------------------------------------------------
     *
     *   Function to call that invokes all of the beacon submission functions
     *
     *----------------------------------------------------------------------*/
    init: function() {
        if (window.addEventListener) {
            window.addEventListener('load', beacon.loadEvents, false);
            // window.addEventListener('unload', beacon.unloadEvents, false);
            window.addEventListener('beforeunload', beacon.beforeUnloadEvents, false);
        } else {
            window.attachEvent('onload', beacon.loadEvents);
            // window.attachEvent('onunload', beacon.unloadEvents);
            window.attachEvent('onbeforeunload', beacon.beforeUnloadEvents);
        }
    },
 
    loadEvents: function() {
            beacon.sendIndex(endPoint);
            beacon.sendPage(endPoint); 
    },
 
    beforeUnloadEvents: function() {
            beacon.pcrSend(endPoint); 
    },
 
    /*-----------------------------------------------------------------------
     *
     *   Function to convert a string into a 32bit integer
     *
     *----------------------------------------------------------------------*/
    hashCode: function(stringToEncode) {
        var encodedString = 0;
        if (stringToEncode.length === 0)
            return encodedString;
        for (var i = 0; i < stringToEncode.length; i++) {
            var letr = stringToEncode.charCodeAt(i);
            encodedString = (encodedString << 5) - encodedString + letr;
            encodedString = encodedString & encodedString;
        }
        return encodedString;
    },
 
    /*-----------------------------------------------------------------------
     *
     *   Function that collects custom timers added to the prs object,
     *   adds appropriate formatting, checks for length and returns the beacon
     *
     *  requires a script tag to be added to the head of every page, whose contents are:
 
     var prs={rt:function(label,ts){this[label]=(ts||ts==0?ts:new Date().getTime());}}
 
     *  This is essentially a replacement for W3C userTiming that was used before that 
     *     functionality existed.  Regardless of the existence of userTiming in a browser
     *     this function allows similar functionality.
     *----------------------------------------------------------------------*/
    pcrSend: function(beaconEndpoint) {
        if(Object.keys) {
            // Limit number of objects to return in case of client problem adding to the timer object
            if(prs && (Object.keys(prs).length> 1 && Object.keys(prs).length<17)){
                // Set given product code value, if not specified, assume SD
                if(BPM.cpc){prs.cpc=BPM.cpc;}else{prs.cpc='def';}
                // Set designation variables
                prs.pagetype = BPM.pageType;
                prs.sdsh = beacon.hashCode(BPM.sessId);
                prs.tidh = beacon.hashCode(BPM.tranId);
 
                if ('performance' in window){
                    var wpt=window.performance.timing;
                    prs.navigationStart = wpt.navigationStart;
                } else {
                    prs.navigationStart=-1;
                }
                var queryStr='';
                var prsLen=Object.keys(prs).length;
                for(var i=1;i<prsLen;i++){
                    var tOfV=typeof prs[Object.keys(prs)[i]];
                    if ( tOfV== 'string' || tOfV== 'number' ){
                        if(queryStr!==''){queryStr+='&';}
                        queryStr+=Object.keys(prs)[i]+'='+prs[Object.keys(prs)[i]];
                    }
                }
 
                beacon.trackItem(beaconEndpoint + "/timers?" + queryStr);
            }
        }
    },
 
    /*-----------------------------------------------------------------------
     *
     *   Function that collects demographic and data that is
     *     categorical/qualitative rather than quantitative.
     *   Some of this previously resided in the sendPage beacon - that
     *     is now being reserved for performance timing data
     *
     *----------------------------------------------------------------------*/
    sendIndex: function(beaconEndpoint) {
        var sds = BPM.sessId
            , tranId = BPM.tranId
            , sdsh = beacon.hashCode(sds)
            , tidh = beacon.hashCode(tranId)
            ,idxBase = ""
        ; 
        //  Common Values -----------------------------
        if(BPM.cpc){idxBase +='cpc='+BPM.cpc;}else{idxBase+="cpc=def";}
        idxBase += "&pagetype=" + BPM.pageType;
        idxBase += "&sds=" + sds;
        idxBase += "&tranId=" + tranId;
        idxBase += "&sdsh=" + sdsh;
        idxBase += "&tidh=" + tidh;
        // Height+Width of Browser -------------------------------
        if (document.documentElement.clientWidth && document.documentElement.clientHeight) {
            idxBase+= "&winHeight=" + document.documentElement.clientHeight;
            idxBase+= "&winWidth=" + document.documentElement.clientWidth;
        }
        // DOM Count = measure of document complexity ----------------------------
        idxBase+= "&domCount=" + document.getElementsByTagName("*").length;
 
        beacon.trackItem(beaconEndpoint + "/idx?" + idxBase);
    },
 
    /*-----------------------------------------------------------------------
     *
     *   Function to interrogate existence of W3C navigationTiming spec
     *     if it exists, grab identifying values - cpc, session, transaction id,
     *     pagetype and send those back with the timers
     *
     *----------------------------------------------------------------------*/
    sendPage: function(beaconEndpoint) {
        if ("performance" in window){
            if("timing" in window.performance) {
                var navigationTiming = window.performance.timing;
                var pageBase = "";
                // Common Values
                if(BPM.cpc){pageBase+='cpc='+BPM.cpc;}else{pageBase+="cpc=def";}
                pageBase+= "&pagetype=" + BPM.pageType;
                pageBase+= "&sdsh=" + beacon.hashCode(BPM.sessId);
                pageBase+= "&tidh=" + beacon.hashCode(BPM.tranId);
                if (document.location.href){
                    pageBase+= "&href=" + encodeURIComponent(document.location.href);
                }
                // Grab timers from the interface and return them if loadEventEnd is past
                if (navigationTiming.loadEventEnd > 0) {
                    // append timers to url string
                    for (var timer in navigationTiming){
                       if(typeof navigationTiming[timer] == 'number'){
                            pageBase+= "&" + timer + "=" + navigationTiming[timer];
                        }
                    }
                    /* If chrome browser, grab their measure of FirstPaint */
                    if (typeof chrome != "undefined") {
                        if ("loadTimes" in chrome) {
                            pageBase+= "&msFirstPaint=" + Math.round(chrome.loadTimes().firstPaintTime * 1E3);
                        }
                    }
                    // build full URL then append the image to the body
                    beacon.trackItem(beaconEndpoint + "/pageReport?" + pageBase);
                } else{
                    setTimeout(beacon.sendPage(beaconEndpoint), 100);
                }
            }
        }
    },
 
    /*-----------------------------------------------------------------------
     *
     *   Helper function for a compatible (and non-jQuery requiring) image
     *     creation method
     *
     *----------------------------------------------------------------------*/
    trackItem: function(value) {
        var image = new Image();
        image.width = 0;
        image.height = 0;
        image.style.display = 'none';
        image.src = value;
        document.body.appendChild(image);
    }
 
};
 
/*--------------------------------------------
*
*  Call the init function to queue the beacons
*
*----------------------------------------------*/
beacon.init();
