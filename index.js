const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

const {PubSub} = require('@google-cloud/pubsub');
const pubsub = new PubSub();

const fs = require('fs');
const util = require('util');
const writeFilePromisified = util.promisify(fs.writeFile);


// subscribe is the main function called by Cloud Functions.
module.exports.subscribe = async (data, context, callback) => {
    const bucketName = getEnvVar('LOCK_BUCKET');

    if (await acquireLock(bucketName, `throttle-${process.env.FUNCTION_NAME}.lock`)) {
        // Send message to Pub/Sub
        console.log('Sending message to Pub/Sub.');
        const topicName = getEnvVar('DESTINATION_TOPIC');
        await sendToPubsub(topicName, data.data);
    } else {
        console.log(`The message was throttled because the lock hasn't expired.`, data);
    }
    callback();
};

const acquireLock = async (bucketName, objectName) => {
    // Get lock file expiration from GCS.
    const bucketHandle = storage.bucket(bucketName);
    const lockDate = await getLastModifiedDate(bucketName, objectName);
    console.log(`Lock creation date is ${lockDate}.`);

    let canAcquireLock = false;
    if (!lockDate) {
        canAcquireLock = true;
    } else {
        const lockAgeInSeconds = getAgeInSeconds(lockDate);
        console.log(`Lock age is ${lockAgeInSeconds} seconds.`);

        // Get lock expiration.
        const lockExpirationInSeconds = parseInt(getEnvVar('LOCK_EXPIRATION_IN_SECONDS', '60'));
        console.log(`Lock expiration is ${lockExpirationInSeconds} seconds.`);

        canAcquireLock = lockAgeInSeconds > lockExpirationInSeconds;
    }

    if (canAcquireLock) {
        console.log(`Writing lock file ${objectName} to GCS bucket ${bucketName}`);
        const localFilename = '/tmp/tempfile.txt';
        // Upload lock file to GCS.
        await writeFilePromisified(localFilename, 'dummy');
        await bucketHandle.upload(localFilename, {destination: objectName});
    }

    return canAcquireLock;
};

function shouldThrottle(lockDate) {

}

function sendToPubsub(topicName, data) {
    const dataBuffer = Buffer.from(data, 'base64');

    return pubsub
        .topic(topicName)
        .get({autoCreate: true})
        .then(([topic]) => topic.publisher.publish(dataBuffer));
}

const getAgeInSeconds = (date) => {
    const now = new Date();
    const diffInMilliseconds = now - date;
    return diffInMilliseconds / 1000;
};

const getLastModifiedDate = async (bucketName, object) => {
    const bucket = storage.bucket(bucketName);

    const file = bucket.file(object);

    try {
        const data = await file.getMetadata();
        const metadata = data[0];
        const updated = metadata.updated;
        if (updated) {
            return new Date(updated);
        } else {
            return null;
        }
    } catch (e) {
        if (typeof e.code !== 'undefined' && e.code === 404) {
            // File doesn't exist.
            console.log(e);
            return null
        } else {
            throw(e);
        }
    }
};

const getEnvVar = (varName, defaultVal) => {
    if (typeof process.env[varName] === 'undefined') {
        if (typeof defaultVal === 'undefined') {
            throw `${varName} environment variable is not defined - lol.`;
        } else {
            return defaultVal
        }
    } else {
        return process.env[varName];
    }
};
