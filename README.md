# Throttle Pub/Sub Cloud Function

Google Cloud function that can throttle messages in a Pub/Sub topic.
It uses a GCS bucket with a Retention Policy to store a lock file. 
Last modified date of this file is used to decide whether a message should be throttled.
Retention Policy prevents race conditions in case of high contention. 
The GCS bucket should be used to store a lock only if the performance is not critical.
In other cases Redis can be used instead.

1. Create a GCS bucket with a Retention Policy with Duration 60 seconds. 

2. Update config.sh with your values:
- `LOCK_BUCKET` - the name of your bucket.
- `LOCK_EXPIRATION_IN_SECONDS` - 1 message per `LOCK_EXPIRATION_IN_SECONDS` seconds will passed,
other messages will be throttled. Must be more than 60.
- others are self-explanatory.
 

