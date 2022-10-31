const debug = require('debug')('app:server');
const debugError = require('debug')('app:error');
const express = require('express');
const { nanoid } = require('nanoid');
const config = require('config');
const dbModule = require('./database');
const {authMiddleware} = require('@merlin4/express-auth')

if(!config.get('db.url')) {
  throw new Error('db.url not defined!')
}
if(!config.get('auth.secret')) {
  throw new Error('auth.secret not defined!')
}
if (!config.get('auth.tokenExpiresIn')) {
  throw new Error('auth.tokenExpires not defined!')
}
if (!config.get('auth.cookieMaxAge')) {
  throw new Error('auth.cookieMaxAge not defined!')
}
if (!config.get('auth.saltRounds')) {
  throw new Error('auth.saltRounds not defined!')
}

//define  custom objectId  validator
const Joi  = require('joi');
Joi.objectId = () => {
  return Joi.any()  .custom((value, helpers) => {
    try {
      if (!value) {
        return helpers.error('any.objectId');
      } else if (typeof value !== 'string' && typeof value !== 'object') {
        return helpers.error('any.objectId');
      } else {
        return new ObjectId(value);
      }
    } catch (err) {
      return helpers.error('any.objectId');
    }
  })
  .rule({
    message: { 'any.objectId': '{#label} was not a valid ObjectId' }
  })
  .required();
}

//construct express app
const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(require('cookie-parser')());
app.use(require('./middleware/auth')());
app.use(
  authMiddleware('my super secret key', 'authToken', {
    httpOnly: true,
    maxAge: 1000 * 60 * 15,
  })
);

//define routes
app.use(require('./routes/api/pet'));
app.use('/api/user',require('./routes/api/user'))
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
