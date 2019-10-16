#!/usr/bin/env bash

FUNCTION_NAME=throttle-function
FUNCTION_RUNTIME=nodejs8
FUNCTION_TRIGGER_TOPIC=input_topic
DESTINATION_TOPIC=input_topic.throttled
LOCK_BUCKET=lock-bucket-name
LOCK_EXPIRATION_IN_SECONDS=3600
