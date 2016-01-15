# beaconCatcher
extremely lightweight RUM solution including JS beacon, nodeJS application to collect &amp; pre-process data with logging and output to metric aggregation tools

## Quick Start
### beaconCatcher
* install node for your platform
* clone this repository (or download and unzip)
* cd to your local directory
* install node dependencies `npm install` (you may need to do some extra work for downloading the geoIp csv files)
* start beaconCatcher.js `node beaconCatcher.js _uniqueInstanceId_ _hostedGraphiteAPIKey_` (optionally add `raw` to end for raw logging)

### beacon
* add an object to your pages like:
* 
    BPM:{
    cpc:<product identifier>,
    pagetype:<page category name>,
    sessId:<unique session ID>,
    tranId:<unique per session transaction ID>
    }
* add this to the head for custom timers `<script>var prs={rt:function(label,ts){this[label]=(ts||ts==0?ts:new Date().getTime());}}</script>`
* add a script tag at the end of your document's body to include the beacon.js file
* deploy the beacon.js with your code
