const http = require('node:http')
http
  .createServer((_request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.end('devcontainer forwardPorts acceptance\n')
  })
  .listen(3000, '127.0.0.1')
