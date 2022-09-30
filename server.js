const debug = require('debug')('app:server');
const debugError = require('debug')('app:error');
const express = require('express');
const { nanoid } = require('nanoid');
const config = require('config');
const dbModule = require('./database')

//construct express app
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//define routes
app.use(require('./routes/api/pet'));
//handle errors
app.use((req,res,next) =>{
  res.status(404).json({error:'Page not found!'});
});

app.use((err,req,res,next) => {
  res.status(500).json({error:err.message});
});

//start listening for requests
const host = config.get('http.host');
const port = config.get('http.port');
app.listen(port, () => {
  debug(`Server running at http://${host}:${port}`);
});
