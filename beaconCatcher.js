/*==========================================
//   "Catcher" portion of beaconCatcher project
//   refer to documentation on github if you require further details/clarification
//
//   usage:
//     - node beaconCatcher.js <uniqueInstanceID> <baseKeyForHostedGraphite> <writeRawLogs:raw|nothing>
//     
//   e.g.:
//    - node beaconCatcher.js i-6sifk978 edfe-alk9877s-lkjlkjsd-45533 raw
//==========================================*/

//==========================================
// load modules
var http = require('http');
var querystring = require('querystring');
var urllib = require('url');
var geoIp = require('geoip-lite');
var fs=require('fs');

// Define directory for Log Files
var basePath='/home/ubuntu/rumLogs/';

//==========================================
// Handle command line input
//==========================================
var myArgs = process.argv.slice(2);
 // console.log('myArgs: ', myArgs);

// assign instanceID to variable to prevent logs from overwriting
if(myArgs[0] !== 0){
  instId=myArgs[0];
} else {
  instId=Date.now();
}

// assign hostedGraphiteKey to variable
if(myArgs[1] !== 0){
  hgKey=myArgs[1];
} else {
  hgKey = ''
}

// Write raw logs?
if(myArgs[2]==='raw'){
  var winston=require('winston');
  writeLogs='raw';
} else {
  writeLogs='';
}

// Load UserAgent Library & prime for lookups
var useragent = require('useragent');
useragent(true);

////////////////////////////////////////////////////
// This is the port for connecting to this service
var PORT=18081;

// For UDP send
var dgram = require('dgram');
var HOST='statsd.hostedgraphite.com';
var UDPPort=8125;
var client = dgram.createSocket('udp4');

////////////////////////////////////////////////////////////////
// Suggested list of optional countries for specific montioring
//    Add or remove as appropriate for your application
var countries=['JP','CN','KR','US','CA','BR','AR','MX','DE','FR','IT','ES','NL','GB','AU'];

//==============================
// Custom Logger Function
//    Accepts given destination & JSON content and writes the log
//==============================
function writeLog(dest,content){
  // console.log(JSON.stringify(content))
  var d=new Date();
  var yr=d.getFullYear().toString();
  var h=d.getHours()
  var hr= h < 10 ? '0'+h.toString() : h;
  var dy=d.getUTCDate();
  var day = dy < 10 ? '0'+dy.toString() : dy.toString();
  var M=d.getUTCDate()+1;
  var mon = M < 10 ? '0'+M.toString() : M.toString();
  var m = ~~(d.getMinutes()/5)*5;
  var min = m < 10 ? '0'+m.toString() : m.toString();
 
   var todayDT=yr+mon+day+'-'+hr+min
  
  var fileName=dest+'-'+todayDT+'-'+'.log';

  logLine=Date.now().toString()+' '+JSON.stringify(logIt)+'\n';

  fs.appendFile(fileName,logLine);

}

//==================================================================
// Custom RAW Logger Function
//    takes the raw output from the request object and writes a log
//      very similar to previous apache logs
//===================================================================
function writeRawLog(request,ip,geo){
  if(writeLogs==='raw'){
    // console.log(JSON.stringify(content))
    var r=request;
    var d=new Date();
    var h=~~(d.getHours()/4)*4
    var hr= h < 10 ? '0'+h.toString() : h;
    var todayDT=d.getFullYear().toString()+''+(d.getUTCMonth()+1).toString()+''+d.getUTCDate()+'-'+hr
    var fileName='raw-'+todayDT+'.log';


    var logLine =d.toJSON()+'\t'+ip+'\t'+geo.country+'\t'+geo.city+'\t'+r.method+'\t'+decodeURI(r.url) +'\t'+r.headers['referer']+'\n'
    //console.log(logLine);
    fs.appendFile(fileName,logLine);
  } else {
    return true;
  }
}

//============================================================
// Function to Handle Request response & routing
//============================================================
function handleRequest(req, res){
  //Parse URL to determine path & prepare for further steps
  var parsedURL = urllib.parse(req.url);
  var pathName=parsedURL.pathname;
  var requestObj=querystring.parse(parsedURL.query);

  //============================================================
  // GeoIP Matching
  //-- Find requester's IP address
  var ipAddr = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  // Only for local testing
  // ipAddr='198.185.18.207';

  // IP usually comes out with leading colons, remove or accept as is
  var ipAddress = ipAddr.indexOf(':') > -1 ? ipAddr.substr(7,ipAddr.length) : ipAddr;
  // console.log(ipAddress);

  // Call the IP match function to generate object with relevant GeoIP data
  geo=geoIp.lookup(ipAddress);
  // console.log(geo);


  // respond to health check requests
  if (pathName === '/'){
    res.writeHead(200);
    res.write('all is well!');
    res.end();
  }else{ // respond to beacon requests
    // return 204 so the browser can forget and move on
    res.writeHead(204);
    res.end();

    // Function remains in place - if command line argument isn't set, 
    //    the function simply returns TRUE
    writeRawLog(req,ipAddress,geo);

  //============================================================
  // Determine cert vs. prod for metrics & log naming
  //
  //   EXAMPLE IF YOU WANT TO SEND ALL METRICS TO THE SAME LOCATION
  //      UPDATE WITH YOUR SPECIFIC CRITERIA  

  /*
  //console.log(req.headers)
  var ref=req.headers['referer'];
  //console.log(ref)
  if (ref !== undefined && ref.indexOf('cert')>0){
    // console.log("it's cert");
    // console.log(ref)
     env='cert';
     fileEnv='cert';
  } else {
    // console.log("it's prod");
    // console.log(ref);
    env='prod';
    fileEnv=env;
  }
  */

    // Object to hold values to send to graphite
    tmr={};
    // Object to hold values to write to log
    logIt={};

    //Parse URL to determine path & further steps
    var parsedURL = urllib.parse(req.url);
    var pathName=parsedURL.pathname;
    var requestObj=querystring.parse(parsedURL.query);

    // console.log(requestObj);
        

    // Prime logging object with general variables per request
    //
    // cpc = product code
    // pagetype = page category
    // sdsh = value to designate unique session id
    // tidh = value to designate unique transaction id when connected to session
    logIt.cpc=requestObj.cpc;
    logIt.pagetype=requestObj.pagetype;
    logIt.country=geo.country;
    logIt.city=geo.city;
    logIt.sdsh=requestObj.sdsh;
    logIt.tidh=requestObj.tidh;

    // Handling different Beacon Types
    if (pathName==='/pageReport'){
        pageReportProcess(requestObj,fileEnv);
        udpSend(tmr,requestObj,geo,env);
    }
    else if (pathName==='/timers'){
        timersProcess(requestObj,fileEnv);
        udpSend(tmr,requestObj,geo,env);
    }
    else if (pathName==='/resource'){
        resourceProcess(requestObj,fileEnv);
    }
    else if (pathName==='/idx'){
        idxProcess(requestObj,req,fileEnv);
    }
  }
} //  END OF FUNCTION - handleRequest(request, response)

//============================================================
//============================================================
//
//      Process per record type - make module??
//
//============================================================
//============================================================

//==============================
// handle pageReport records
//    core W3C navigationTiming Spec metrics
//==============================
function pageReportProcess(q,fenv,env){
 //console.log('pageReport')
 //console.log(q)

 // Assign navigationStart to variable for simplification
 ns=q.navigationStart||-1;

 // if navigationStart is greater than Jan 2012, proceed
 // sanity check for valid data
 if(ns > 1325376000000) {

   // Calculate key timing metrics based on some rule-of-thumb sanitization factors
   tmr.dns=q.domainLookupEnd-ns>10  && q.domainLookupEnd-ns < 60000 ? q.domainLookupEnd-ns:-1;
   tmr.net=q.connectEnd-ns>10 && q.connectEnd-ns<60000 ? q.connectEnd-ns:-1;
   tmr.ttfb=q.responseStart-ns>50  && q.responseStart-ns < 180000 ? q.responseStart-ns:-1;
   tmr.domi=q.domInteractive-ns>50  && q.domInteractive-ns < 180000 ? q.domInteractive-ns:-1;
   tmr.fp=q.msFirstPaint-ns>100 && q.msFirstPaint-ns < 300000 ? q.msFirstPaint-ns:-1;
   tmr.sr=q.domContentLoadedEventEnd-ns>100  && q.domContentLoadedEventEnd-ns < 600000 ? q.domContentLoadedEventEnd-ns:-1;
   tmr.pgl=q.loadEventEnd-ns>100  && q.loadEventEnd-ns < 600000 ? q.loadEventEnd-ns:-1;

   for(m in tmr){
     if(tmr[m]>0){
       logIt[m]=tmr[m];
     }
   }
   baseFile=basePath+instId+'-'+fenv+'-timers';
   writeLog(baseFile,logIt);
  }
}

//==============================
// handle timers records
//   used to augment or use in addition to the 
//   W3C userTiming spec
//==============================
function timersProcess(q,fenv){
  ns=q.navigationStart||-1;
  if(ns > 1325376000000) {
    //tm.pcr=q.pcr-ns>100?q.pcr-ns:-1
    tmr.pcr=q.pcr-ns>100  ?  q.pcr-ns : q.abs_end-ns>100  ?  q.abs_end-ns : -1;
    for (i in q){
      if(i.indexOf('scr_')>-1){
        tmr[i]=q[i]-ns>100  && q[i]-ns < 60000  ?  q[i]-ns : -1;
      }
    }

    for(m in tmr){
      if(tmr[m]>0){
        logIt[m]=tmr[m];
      }
    }

   baseFile=basePath+instId+'-'+fenv+'-timers';
   // writeLog(baseFile,logIt);
  }
  // Always write log to timers log, regardless of data quality - to help track odd user behavior
  writeLog(baseFile,logIt);
}

//==============================
// handle idx records
//    records to capture contextual metrics
//    allows trending or analysis of page complexity (domC),
//      user platforms, etc...
//==============================
function idxProcess(q,req,fenv){
  var agent = useragent.parse(req.headers['user-agent']);
  osv= agent.os.minor ? agent.os.major+'.'+agent.os.minor : agent.os.major;

  logIt.browser={'family':agent.family,'major':agent.major};
  logIt.os={'family':agent.os.family,'version':osv};
  logIt.domC=q.domCount;
  logIt.winH=q.winHeight;
  logIt.winW=q.winWidth;
  // logger.debug(logIt);

   baseFile=basePath+instId+'-'+fenv+'-idx';
   writeLog(baseFile,logIt);
}

//==============================
// handle resource records
//    Currently, W3C resourceTiming spec is of marginal
//       utility for regular measurement.  It simply records
//       time taken to transfer the resources.  There is value
//       in looking at this level of data, but it should be considered 
//       a secondary or tertiary priority.
//    if using resourceTiming version of beacon,
//       this code captures the data to log for further
//       summary/analysis
//==============================
function resourceProcess(q,fenv){
  for(i in q){
    iOb=JSON.parse(i);
    // logIt.resources=iOb;

    for (r in iOb){
      // console.log(r)
      if(r==0){
        resources=[]
        logIt.sdsh=iOb[r]['sdsh'];
        logIt.tidh=iOb[r]['tidh'];
      } else {
        resources.push(iOb[r])
      }

      logIt.resources=resources;
    }
  }

   baseFile=basePath+instId+'-'+fenv+'-resource';
   writeLog(baseFile,logIt);
}


//==============================
// Send Metrics to UDP/StatsD
//==============================
hostedGraphiteKey = hgKey
function udpSend(t,ro,g,env){
  // If hgKey is set, send metrics to your statsD instance.  Otherwise, move on.
  if(hgKey!==''){

    //  Evaluate GeoIP data and capture country specific metric designation or simply send a metric
    //     to the global metric name 
    if(countries.indexOf(g.country)>-1)baseCountry=env+'.'+ro.cpc+'.'+ro.pagetype+'.'+g.country
    baseGlobal=env+'.'+ro.cpc+'.'+ro.pagetype
    toSend=''
    for(metric in t){
      if(t[metric] > 0){
        if(countries.indexOf(g.country)>-1) toSend+=hostedGraphiteKey+'.'+baseCountry+'.'+metric+':'+t[metric]+'|ms\n';
        toSend+=hostedGraphiteKey+'.'+baseGlobal+'.'+metric+':'+t[metric]+'|ms\n';
      }
    }
    // console.log(toSend);

    // Prepare connection for UDP communication
    // then send metrics to StatsD
    var message = new Buffer(toSend);
    // var client = dgram.createSocket('udp4');
    client.send(message, 0, message.length, UDPPort, HOST, function(err, bytes) {
      if (err) throw err;
      // console.log('UDP message sent to ' + HOST +':'+ UDPPort);
      // console.log(bytes)
      // client.close();
    });
  }
};


//  Evaluate number of CPUs on server
var cluster = require("cluster");
var numCPUs = require("os").cpus().length;

//  Start instances of this process equal to the number of CPUs avaialable
if (cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
     cluster.fork();
  }

  cluster.on("exit", function(worker, code, signal) {
     cluster.fork();
  });
} else {
  //Create a server
  var server = http.createServer(handleRequest);

  //Lets start our server
  server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
  });
}

