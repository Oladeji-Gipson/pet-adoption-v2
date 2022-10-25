const debug = require('debug')('app:api:user');
const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const config = require('config');
const jwt = require('jsonwebtoken');
const { newId, insertUser, updateUser, getUserById, getUserByEmail, saveEdit } = require('../../database');
const validBody = require('../../middleware/validBody');
const validId = require('../../middleware/validId');

const registerSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().trim().min(8).required(),
  fullName: Joi.string().trim().min(1).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().trim().min(8).required(),
});

const updateSchema = Joi.object({
  password: Joi.string().trim().min(8),
  fullName: Joi.string().trim().min(1),
})

const router = express.Router();

router.post('/register', validBody(registerSchema), async (req,res,next) => {
  try {
    const user = {...req.body, _id: newId(), createdDate: new Date(), role: 'Customer'};

    const saltRounds = parseInt(config.get('auth.saltRounds'));

    user.password = await bcrypt.hash(user.password, saltRounds)

    if (await getUserByEmail(user.email)) {
      res.status(400).json({error: `Email ${user.email} is already in use.`})
    } else {
      const dbResult = await insertUser(user);
      debug(dbResult)

      //issue token
      const authPayload = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }
      const authSecret = config.get('auth.secret')
      const authOptions = {expiresIn: config.get('auth.tokenExpiresIn')};
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      //create a cookie
      const cookieOptions = {httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge'))}
      res.cookie('authToken', authToken, cookieOptions)

      res.json({message: 'New User Registered!', userId: user._id, token: authToken});
    }
  } catch(err) {
    next(err)
  }
})

router.post('/login', validBody(loginSchema), async (req, res, next) => {
  try {
    const login = req.body;
    const user = await getUserByEmail(login.email)
    debug(user.password)
    debug(await bcrypt.compare(login.password, user.password))
    if (user && await bcrypt.compare(login.password, user.password)) {

      const authPayload = {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      }
      const authSecret = config.get('auth.secret')
      const authOptions = {expiresIn: config.get('auth.tokenExpiresIn')};
      const authToken = jwt.sign(authPayload, authSecret, authOptions);

      //create a cookie
      const cookieOptions = {httpOnly: true, maxAge: parseInt(config.get('auth.cookieMaxAge'))}
      res.cookie('authToken', authToken, cookieOptions)

      res.json({message : 'Welcome back!', userId: user._id, token: authToken})
    } else {
      res.status(400).json({error: 'Invalid Credentials'})
    }
  }
  catch (err) {
    next(err)
  }
})

router.put('/me', validBody(updateSchema), async (req, res, next) => {
  //self-service update
  try {
    if(!req.auth) {
      return res.status(401).json({error: 'You must be logged in!'})
    }
    const userId = newId(req.auth._id);
    const update = req.body;
    if (update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'))
      update.password = await bcrypt.hash(update.password, saltRounds)
    }
   debug(`Update Object: ${update.fullName}`);
   debug(`Auth Object id: ${req.auth._id}`)
    if (Object.keys(update).length > 0) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
    }

    const dbResult = await updateUser(userId, update);
    debug(`Database Result: ${dbResult}`);

    const edit = {
      timestamp: new Date(),
      op: 'update',
      col: 'users',
      target:  {userId},
      update,
      auth: req.auth,
    };
    await saveEdit(edit);

    res.json({message: 'User Updated!'})
  } catch (err) {
    next(err)
  }
});

router.put('/:userId', validBody(updateSchema), validId('userId'), async (req, res, next) => {
  //admin update
  try {
    const userId = req.userId;
    const update = req.body;

    if(update.password) {
      const saltRounds = parseInt(config.get('auth.saltRounds'))
      update.password = await bcrypt.hash(update.password, saltRounds)
    }
    if (Object.keys(update).length > 0) {
      update.lastUpdatedOn = new Date();
      update.lastUpdatedBy = {
        _id: req.auth._id,
        email: req.auth.email,
        fullName: req.auth.fullName,
        role: req.auth.role,
      };
    }

    const dbResult = await updateUser(userId, update);
    debug(dbResult);

    const edit = {
      timestamp: new Date(),
      op: 'update',
      col: 'users',
      target:  {userId},
      update,
      auth: req.auth,
    };
    await saveEdit(edit);

    if(dbResult.matchedCount > 0) {
      res.json({message: 'User Updated', userId})
    }
    else {
      res.status(404).json({error: 'User Not Found!'});
    }
  } catch (err) {
    next(err)
  }
});

module.exports = router;