const express = require('express');
const app = express();
const path = require('path')
const formidable = require('formidable')
const fs = require('fs')
const AWS = require("aws-sdk");
const crypto = require('crypto')

const s3 = new AWS.S3()
const sqs = new AWS.SQS({region: "us-east-1"})
const port = 3000

app.get('/', function(req, res) {
  res.sendFile("views/front-page.html", {
    root: path.join(__dirname, './')
  })
})

app.post('/upload', function(req, res) {
  var form = new formidable.IncomingForm()
  form.parse(req, function (err, fields, files) {
    const content = fs.readFileSync(files.fileToUpload.filepath)
    var filename = files.fileToUpload.originalFilename
    const randomString = crypto.randomBytes(25).toString('hex')

    const params = {
      Bucket: 'bucket-html-files-from-website',
      Key: randomString + '.html',
      Body: content
    }

    s3.upload(params, (err, data) => {
      if (err) throw err
      else {
        res.render("success.ejs", {"website": `${req.protocol}://${req.headers.host}/${randomString}`, "message": ""})
      }
    })
  })
})

app.post('/sendemail', function (req, res) {
  var form = new formidable.IncomingForm()
  form.parse(req, function (err, fields, files) {
    if (err) console.log(err)
    
    const params = {
      MessageBody: fields.email + " " + fields.website,
      QueueUrl: `https://sqs.us-east-1.amazonaws.com/972976697856/website-viewing-email-queue`
    }

    sqs.sendMessage(params, function (err, data) {
      if (err) {
        console.log(err)
      } else {
        res.render('success.ejs', {"website": fields.website, "message": `Successfully sent an email to ${fields.email}`})
      }
    })
  })
})

app.get('*', function (req, res) {
  const params = {Bucket: "bucket-html-files-from-website", Key: `${req.url.substring(1)}.html`}

  s3.getObject(params, (err, data) => {
    if (err)  {
      res.sendFile("views/filenotfound.html", {
        root: path.join(__dirname, './')
      })
    }
    else {
      fs.writeFileSync('./views/temp.html', data.Body)
      res.sendFile('views/temp.html', {
        root: path.join(__dirname, './')
      })
    }
  })
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
  
