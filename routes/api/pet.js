const debug = require('debug')('app:routes:api:pet');
const debugError = require('debug')('app:error');
const express = require('express');
const { nanoid } = require('nanoid');
const dbModule = require('../../database');
const Joi = require('joi');
const validId = require('../../middleware/validId');
const validBody = require('../../middleware/validBody')

const newPetSchema = Joi.object({
  species: Joi.string().trim().min(1).pattern(/^[^0-9]+$/, 'not numbers').required(),
  name: Joi.string().trim().min(1).required(),
  age: Joi.number().integer().min(0).max(1000).required(),
  gender: Joi.string().trim().length(1).required(),
});

const updatePetSchema = Joi.object({
  species: Joi.string().trim().min(1).pattern(/^[^0-9]+$/, 'not numbers').required(),
  name: Joi.string().trim().min(1).required(),
  age: Joi.number().integer().min(0).max(1000).required(),
  gender: Joi.string().trim().length(1).required(),
});

//create a router
const router = express.Router();

//define routes
router.get('/api/pet/list', async (req, res, next) => {
  try {
    const pets = await dbModule.findAllPets();
  res.json(pets);
  } catch (err) {
    next(err);
  }
});

router.get('/api/pet/:petId', validId('petId'), async (req, res, next) => {
  try {
    const petId = req.petId
    const pet = await dbModule.findPetById(petId);
    if(!pet) {
      res.status(404).json({ error: `${petId} Id Not Found` })
    } else {
      res.json(pet)
    } 
  } catch (err) {
    next(err);
  }
});
//create
router.put('/api/pet/new', validBody(newPetSchema), async (req, res, next) => {
  try {
    const pet = req.body;
    pet._id = dbModule.newId();

    await dbModule.insertOnePet(pet);
    res.json({ message: 'Pet inserted.' })
  } catch (err) {
    next(err)
  }

});
//update
router.put('/api/pet/:petId', validId('petId'), validBody(updatePetSchema), async (req, res, next) => {
  try {
    const petId = req.petId;
    const update = req.body;
    debug(`update pet ${petId}`, update);

    const pet = await dbModule.findPetById(petId);
    if (!pet) {
      res.status(404).json({error: `Pet ${petId} Not Found.`})
    } else {
      await dbModule.updateOnePet(petId, update);
      res.json({message: `Pet ${petId} Updated.`})
    }
  } catch (err) {
    next(err)
  }
});

//delete
router.delete('/api/pet/:petId', async (req, res, next) => {
  try {
    const petId = dbModule.newId(req.params.petId);
    const pet = dbModule.findPetById(petId)
    debug(`delete pet ${petId}`);
  
    if (!pet) {
      res.status(404).json({error: `Pet ${petId} Not Found.`})
    } else {
      await dbModule.deleteOnePet(petId);
      res.json({message: `Pet ${petId} Deleted.`})
    }
  } catch (err) {
    next(err)
  }
});


//export router
module.exports = router;