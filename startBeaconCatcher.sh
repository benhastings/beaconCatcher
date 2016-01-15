#!/bin/bash
instID=`curl -s http://169.254.169.254/latest/meta-data/instance-id`
echo $instID
#nodeProcs=`ps -ef | grep [m]axIns|grep -v grep|awk '{print $2}' | wc -l`


beaconInstances=`ps -ef|grep [b]eaconCatcher.js|wc -l`
if test $beaconInstances -lt 2; then
  echo "start your engines!"
  /home/ubuntu/.nvm/v5.1.0/bin/node /home/ubuntu/beaconCatcher/beaconCatcher.js $instID _your_hostedGraphite_API_key_

else
  echo "we've already got one... or $beaconInstances"
fi


