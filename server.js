
var fs = require('fs')
var http = require('http')
var url = require('url')
var port = process.argv[2]

if (!port) {
  console.log('请输入端口号')
  process.exit(1)
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true)
  var path = request.url
  var pathNoQuery = parsedUrl.pathname
  var queryObject = parsedUrl.query
  var method = request.method

  console.log('方方说：不含查询字符串的路径为\n' + pathNoQuery)

  if (pathNoQuery === '/') {
    var str = fs.readFileSync('./index.html', 'utf8')
    response.setHeader('Content-Type', 'text/html;charset=utf-8')

    let cookies = request.headers.cookie
    cookies = cookies.split('; ')
    let hash = {}
    cookies.forEach((items) => {
      parts = items.split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value
    })
    console.log(hash.sign_in_email)

    let users = fs.readFileSync('./db/users', 'utf8')    
    users = JSON.parse(users)
    let foundUser = false
    users.forEach((items) => {
      if (items.email === hash.sign_in_email) {
        foundUser = true
      }
    })
    if(foundUser) {
      str = str.replace('__user__', hash.sign_in_email)
      console.log(str)
    }

    response.statusCode = 200
    response.end(str)
  } else if (pathNoQuery === '/sign_up' && method === 'GET') {
    var str = fs.readFileSync('./sign_up.html', 'utf8')
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.statusCode = 200
    response.end(str)
  } else if (pathNoQuery === '/sign_up' && method === 'POST') {
    response.statusCode = 200
    readBody(request).then((body) => {
      body = body.split('&')
      let hash = {}
      body.forEach((item) => {
        parts = item.split('=')
        let name = parts[0]
        let value = parts[1]
        hash[name] = decodeURIComponent(value)
      })
      let { email, password, confirm } = hash

      if (email.indexOf('@') === -1) {
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
          "errors": { "email": "invalid" }
        }`)
      } else if (password != confirm) {
        response.statusCode = 400
        response.write('password no match')
      } else {
        let users = fs.readFileSync('./db/users', 'utf8')
        response.statusCode = 200
        users = JSON.parse(users)

        let inUse = false
        users.forEach((items) => {
          if (items['email'] === email) {
            inUse = true

          }
        })
        if (inUse) {
          response.statusCode = 400
          response.setHeader('Content-Type', 'application/json;charset=utf-8')
          response.write(`{
          "errors": { "email": "inUse" }
        }`)
        } else {
          users.push({ email: email, password: password })
          users = JSON.stringify(users)
          fs.writeFileSync('./db/users', users)
        }

      }
      response.end()
    })
  } else if (pathNoQuery === '/sign_in' && method === 'GET') {
    var str = fs.readFileSync('./sign_in.html', 'utf8')
    response.setHeader('Content-Type', 'text/html; charset = utf-8')
    response.end(str)
  } else if (pathNoQuery === '/sign_in' && method === 'POST') {
    readBody(request).then((body) => {
      body = body.split('&')
      let hash = {}
      body.forEach((item) => {
        parts = item.split('=')
        let name = parts[0]
        let value = parts[1]
        hash[name] = decodeURIComponent(value)
      })
      let { email, password } = hash

      let users = fs.readFileSync('./db/users', 'utf8')
      response.statusCode = 200
      users = JSON.parse(users)
      let found = false
      users.forEach((items) => {
        if (items.email === email && items.password === password) {
          found = true
        }
      })
      if (found) {
        response.setHeader('Set-Cookie', `sign_in_email = ${email}`)
        response.statusCode = 200
      } else {
        response.statusCode = 401
      }

      response.end()
    })
  } else if (pathNoQuery === '/style.css') {
    var str = fs.readFileSync('./style.css', 'utf8')
    response.setHeader('Content-Type', 'text/css; charset = utf-8')
    response.end(str)
  } else if (pathNoQuery === '/main.js') {
    var str = fs.readFileSync('./main.js', 'utf8')
    response.setHeader('Content-Type', 'text/javascript; charset = utf-8')
    response.end(str)
  } else if (pathNoQuery === '/pay') {
    var db = fs.readFileSync('./db')
    var newDb = db - 1
    fs.writeFileSync('./db', newDb)
    response.setHeader('Content-Type', 'text/javascript; charset = utf-8')
    response.statusCode = 200
    response.end(`
      ${queryObject.callback}.call(undefined, {
        'success': true,
        'left': ${newDb}
      })
    `)
  } else {
    response.statusCode = 404
    response.end()
  }

})

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = []
    request.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      resolve(body)
    })
  })
}

server.listen(port)
console.log('监听' + port + '成功')