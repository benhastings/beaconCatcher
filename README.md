# beaconCatcher
extremely lightweight RUM solution including JS beacon, nodeJS application to collect &amp; pre-process data with logging and output to metric aggregation tools

This was built with the assumption of using AWS - adjustments will need to be made for using another deployment methodology.

This repo is the initial public repository of previous work created in a private repo.

## Quick Start
### beaconCatcher
* install node for your platform
* clone this repository (or download and unzip)
* cd to your local directory
* install node dependencies `npm install` (you may need to do some extra work for downloading the geoIp csv files)
* run: `sh startBeaconCatcher.sh`

### beacon
* add an object to your pages like:

        BPM:{
        cpc:_product identifier_,
        pagetype:_page category name_,
        sessId:_unique session ID_,
        tranId:_unique per session transaction ID_
        }
    
* add this to the head for custom timers 
        `<script>var prs={rt:function(label,ts){this[label]=(ts||ts==0?ts:new Date().getTime());}}</script>`
* add a script tag at the end of your document's body to include the beacon.js file
* deploy the beacon.js with your code

NOTE: any JS you deploy should be minified - be sure to use a good minifier after any changes you might make to the beacon before deploying!


## Build beaconCatcher Image
* Create directories - /home/ubuntu/beaconCatcher, /home/ubuntu/rumLogs/, /home/ubuntu/rumLogs/moveToS3/
* Install node
* Install awscli tools
* Add security keys for awsconfigure
* Add crontab


## Coming Soon
* orchestration scripts to keep instances up and running
* cloudFormation template for instances of beaconCatcher
* scripts to move log files to S3 for simple retention or to allow feeding into other tools
* beacon including functionality to capture and log resourceTiming records

## Future Plans
* integrate with InfluxDB instead of statsD/graphite

beaconCatcher is free software/open source, and is distributed under the [BSD license](http://opensource.org/licenses/BSD-3-Clause).

beaconCatcher was created and is maintained by Ben Hastings.

