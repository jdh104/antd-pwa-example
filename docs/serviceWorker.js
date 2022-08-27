
const GET_LOCATION_DATA_TAG = "GLDT";
const SYNC_LOCATION_DATA_TAG = "SLDT";
const IDB_KEY = "HCC-DATA";
const IDB_LAST_SEND_KEY = "HCC-LAST-SEND";

/** in milliseconds */
const LOCATION_FETCH_PERIOD = 60000;

// On the Spark plan, we are allowed 20k database writes per day.
// We should be able to update the database once every 5 seconds and not reach this limit.
// Obviously, there is no need to update that frequently...
/** in milliseconds */
const LOCATION_SYNC_PERIOD = 300000;

const geolocationOptions = {
    enableHighAccuracy: true, 
    timeout: LOCATION_FETCH_PERIOD
};

const firebaseConfig = {
    apiKey: "AIzaSyAUuace0hmkT0j4eef8fx8mkWThoYELDig",
    authDomain: "test-project-d9ceb.firebaseapp.com",
    projectId: "test-project-d9ceb",
    storageBucket: "test-project-d9ceb.appspot.com",
    messagingSenderId: "670886822751",
    appId: "1:670886822751:web:421b873526ad2560302cea",
    measurementId: "G-TCB4F6SQT8"
};

// Bring in the necessary libraries
importScripts('localforage.min.js', 'firebase.min.js', 'firestore.min.js');

// set up persistent-data liaison (localforage)
localforage.config({
    name: 'HCC-DB',
    version: 1.0,
    storeName: 'HCC-STORE',
    description: 'Datastore for HCC application'
});

// set up firestore
const firebaseApp = firebase.initializeApp(firebaseConfig);
const fsCol = firebase.firestore().collection("positions");

/**
 * 
 * @param {GeolocationPosition} pos 
 */
function geoLocationCb(pos) {
    localforage.getItem(IDB_KEY, (err1, data) => {
        if (err1) {
            // PANIC
        } else {
            if (!data) {
                data = [];
            }
            
            data.push(pos);

            localforage.getItem(IDB_LAST_SEND_KEY, (err2, lastSend) => {
                if (err2) {
                    // PANIC
                } else if (lastSend) {
                    data = data.filter(p => p.timestamp && (p.timestamp > lastSend));
                }

                localforage.setItem(IDB_KEY, pos, err3 => {
                    if (err3) {
                        // PANIC
                    }
                });
            });
        }
    });
}

/**
 * 
 * @param {GeolocationPositionError} err 
 */
function geoErrorCb(err) {
    // PANIC
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
        if (!reg.sync) {
            // TODO: tell the user somehow
        } else {
            reg.sync.register(GET_LOCATION_DATA_TAG).catch(err => {
                // PANIC
            }).then(result => {
                // CELEBRATE
            });
        }

        let cacheName = 'antd-pwa';
        let filesToCache = [
            './',
            './index.html',
            './static/js/bundle.js'
        ];

        reg.addEventListener('install', e => {
            e.waitUntil(
                caches.open(cacheName).catch(err => {

                }).then(cache => {
                    return cache.addAll(filesToCache);
                })
            );
        });

        reg.addEventListener('fetch', e => {
            e.respondWith(
                caches.match(e.request).catch(err => {

                }).then(response => {
                    return response || fetch(e.request);
                })
            );
        });

        reg.addEventListener('sync', e => {
            switch (e.tag) {
                case GET_LOCATION_DATA_TAG:
                    setTimeout(() => reg.sync.register(GET_LOCATION_DATA_TAG), LOCATION_FETCH_PERIOD);
                    navigator.geolocation.getCurrentPosition(geoLocationCb, geoErrorCb, geolocationOptions);
                    break;

                case SYNC_LOCATION_DATA_TAG:
                    setTimeout(() => reg.sync.register(SYNC_LOCATION_DATA_TAG), LOCATION_SYNC_PERIOD);
                    localforage.getItem(IDB_KEY, (err1, data) => {
                        if (err1) {
                            // PANIC
                        } else if (data) {
                            let latestTimestamp = Math.max(...data.map(p => p.timestamp));

                            localforage.getItem(IDB_LAST_SEND_KEY, (err2, lastSend) => {
                                if (err2) {
                                    // PANIC
                                } else if (!lastSend || latestTimestamp > lastSend) {
                                    fsCol.add(data).catch(err3 => {
                                        // PANIC
                                    }).then(doc => {
                                        localforage.setItem(IDB_LAST_SEND_KEY, latestTimestamp, err4 => {
                                            if (err4) {
                                                // PANIC
                                            }
                                        });
                                    });
                                }
                            });
                        }
                    });
                    break;

                default:
                    break;
            }
        })
    });
}
