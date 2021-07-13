if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = LocalStorage('/tmp');  // AWS lambda can only create /tmp folder, not ./tmp
  }
  function rateLimiterLocalStorage({secWindow, allowedHits}) {
      return async (req,res,next) => {
              var currentTime = new Date().getSeconds();
              const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress)
              console.log('get file ip')
              const getIp = localStorage.getItem('ip');
              console.log('getIp',getIp)
                  if (getIp!==ip) {
                        var requests = 0;
                        requests = requests + 1;
                        console.log('increasing requests a',requests)
                        localStorage.setItem('requests',requests);
                        localStorage.setItem('ip',ip);
                        console.log('Setting ip')
                        timeRemaining = secWindow;
                        var deadLine = timeRemaining + currentTime ;
                        if (deadLine>60) {deadLine = deadLine - 60};
                        localStorage.setItem('deadLine',deadLine); // 10 sec
                        console.log('timeRemaining c1',timeRemaining,'currentTime',currentTime,'deadLine',deadLine)
                  } else if (getIp===ip) {
                    console.log('geIp===ip',getIp===ip)
                          var requests = parseInt(localStorage.getItem('requests'));
                          var timeRemaining = parseInt(localStorage.getItem('timeRemaining'));
                          console.log('getting time remaining',timeRemaining)
                            console.log('got requests',requests);
    
                            if (!localStorage.getItem('requests')){
                                var requests = 1;
                                localStorage.setItem('requests',requests=1);
                                console.log('err requests',requests)
                            }
                            else if (requests == 1) {
                                requests = requests + 1;
                                console.log('increasing requests b',requests)
                                localStorage.setItem('requests',requests);
                                timeRemaining = secWindow;
                                localStorage.setItem('timeRemaining',timeRemaining);  // 0 sec
                                var deadLine = timeRemaining + currentTime ;
                                if (deadLine>60) {deadLine = deadLine - 60};
                                localStorage.setItem('deadLine',deadLine); // 10 sec
                                console.log('uploading deadLine',deadLine);
                                console.log('timeRemaining c2',timeRemaining,'currentTime',currentTime,'deadLine',deadLine)  
                            } else if (requests>1) {
                                requests = requests + 1;
                                console.log('increasing requests c',requests)
                                localStorage.setItem('requests',requests);
                                  var deadLine = parseInt(localStorage.getItem('deadLine'));
                                    console.log('getting deadLine',deadLine);
                                    if (deadLine<currentTime) {
                                        var timeRemaining = (deadLine + 60) - currentTime;
                                    } else {
                                        var timeRemaining = deadLine - currentTime;
                                    };
                                    localStorage.setItem('timeRemaining',timeRemaining);  // 0 sec
                                    if (deadLine>60) {deadLine = deadLine - 60};
                                    localStorage.setItem('deadLine',deadLine); // 10 sec
                                    console.log('timeRemaining c3',timeRemaining,'currentTime',currentTime,'deadLine',deadLine);  
    
                              
                                    if (timeRemaining<0 || timeRemaining>secWindow) {
                                        console.log("Time remaining less than 0 or greater than secWindow, restarting clock")
                                        var requests = 1;
                                        localStorage.setItem('requests',requests);
                                    }
                            };
                            if (requests>allowedHits) {
                              res.status(503).json({
                                  Response: '503 error',
                                  'Numer of requests per time frame': requests,
                                  'Time remaining': timeRemaining + ' secs',
                              })
                            } 
                            else { 
                              next(); 
                            }   
                    };               
  
      }
    };
  
    module.exports = rateLimiterLocalStorage;