const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

const {pool} = require('./pool');

// SKIP THIS PART WHEN DEPLOYING IN LAMBDA
const port = 8080;
app.listen(port, function (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log(`Listening on port ${port}`)
  }
})

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// const redis = require('./redis-client');

// const rateLimiter = require('./rate-limiter')

const rateLimiter = require('./rate-limiterLocalStorageOnly'); // reate liminter using Local Storage only wihtout S3

const queryHandler = (req, res, next) => {
  pool.query(req.sqlQuery).then((r) => {
    console.log('R.ROWS',r.rows.length)
    if (r.rows.length==0) {r.rows=0} ;
    return res.json(r.rows);
  }).catch(next)
}

app.get('/',  rateLimiter({secWindow:20,allowedHits:2}), async (req, res) => {
  res.send(`Welcome to EQ Works 😎`)


})

app.get('/api/search', async (req, res, next) => {
  // if (!req.query.poi_name) {req.query.poi_name = 'EQ Works'};
  console.log('req', req.query)                                                                                                                      
    req.sqlQuery = `
    SELECT * FROM 
      (
        SELECT hourly_events.date, hourly_events.hour, hourly_events.events, hourly_events.poi_id,
        hourly_stats.date, hourly_stats.hour, hourly_stats.impressions, hourly_stats.clicks, hourly_stats.revenue, hourly_stats.poi_id,
        poi.poi_id, poi.name, poi.lat, poi.lon
        FROM ((hourly_events
        INNER JOIN hourly_stats ON hourly_events.poi_id = hourly_stats.poi_id)
        INNER JOIN poi ON poi.poi_id = hourly_stats.poi_id)
        WHERE poi.name= '${req.query.poi_name}' 
        LIMIT 50
      )  AS derivedTable ;  
    `
  return next()
}, queryHandler)


app.get('/events/hourly', rateLimiter({secWindow:20,allowedHits:13}), async (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, events FROM public.hourly_events
    ORDER BY date, hour
    LIMIT 100;
  `
  console.log('data247',req.sql)
  return next()
}, queryHandler)


app.get('/events/daily',rateLimiter({secWindow:20,allowedHits:13}),  async (req, res, next) => {
  req.sqlQuery = `
    SELECT date, SUM(events) AS events FROM public.hourly_events
    GROUP BY date
    ORDER BY date;
  `
  return next()
}, queryHandler)

app.get('/stats/hourly', rateLimiter({secWindow:20,allowedHits:13}), async (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, impressions, clicks, revenue FROM public.hourly_stats
    ORDER BY date, hour
    LIMIT 100;
  `
  return next()
}, queryHandler)

app.get('/stats/daily', rateLimiter({secWindow:20,allowedHits:13}), async (req, res, next) => {
  req.sqlQuery = `
    SELECT date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(revenue) AS revenue
    FROM public.hourly_stats
    GROUP BY date
    ORDER BY date;
  `
  return next()
}, queryHandler)

app.get('/poi', rateLimiter({secWindow:20,allowedHits:13}), async (req, res, next) => {
  req.sqlQuery = `
    SELECT *
    FROM public.poi;
  `
  return next()
}, queryHandler)

// last resorts
process.on('uncaughtException', (err) => {
  console.log(`Caught exception: ${err}`)
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(1)
})


module.exports = app;